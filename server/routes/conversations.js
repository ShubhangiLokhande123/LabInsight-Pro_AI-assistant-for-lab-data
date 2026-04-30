const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { saveMessage, getConversationsByUser, getConversationByID } = require("../controllers/conversationController");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require("fs");
const path = require("path");

const OLLAMA_HOST = process.env.OLLAMA_HOST || "http://127.0.0.1:11434";
const OLLAMA_MODELS = ["llama3.2:latest", "llama3.1:8b"];
const SYSTEM_PROMPT = "You are a concise and precise medical assistant. Only utilize the biomarker data if the user asks a question about it. Respond only to the user's specific query using the data explicitly provided. Use only the biomarker data and context provided; do not fabricate or infer any new data. If the question cannot be answered with the given data, state: 'I require more specific information to answer this question.' Avoid all disclaimers, legal statements, or irrelevant remarks. Keep answers short, direct, and focused on the user's query. For biomarker data, analyze trends or abnormalities based solely on the provided historical data. Don't format list elements with bold.";

const loadBiomarkerData = () => {
	const biomarkerDataPath = path.resolve(__dirname, "../data/biomarkers.json");
	const biomarkerData = JSON.parse(fs.readFileSync(biomarkerDataPath, "utf-8"));
	return biomarkerData;
};

const containsBiomarkerMention = (message, biomarkerList) => {
	const keywords = ["report", "test", "result", "level", "measurement", "blood"];
	for (const biomarker in biomarkerList) {
		const aliases = biomarkerList[biomarker].aliases;
		if (aliases.some(alias => message.toLowerCase().includes(alias.toLowerCase()))) {
			return biomarker;
		}
	}
	if (keywords.some(keyword => message.toLowerCase().includes(keyword.toLowerCase()))) {
		return "report";
	}
	return null;
};

const buildFullMessage = (message, biomarkerData, messages) => {
	const biomarkerList = loadBiomarkerData();
	const mentionedBiomarker = containsBiomarkerMention(message, biomarkerList);
	let fullMessage = message;
	if (mentionedBiomarker) {
		fullMessage += `. Here is the biomarker data: ${JSON.stringify(biomarkerData)}`;
	}
	if (messages && messages.length > 0) {
		const context = messages.map(item => `${item.sender}: ${item.text}`).join('\n');
		fullMessage = `Previous context: ${context}. New message: ${fullMessage}`;
	}
	return fullMessage;
};

// Try a single Ollama model; throws on failure
const tryOllamaModel = async (model, fullMessage) => {
	const requestPayload = {
		model,
		messages: [
			{ role: "system", content: SYSTEM_PROMPT },
			{ role: "user", content: fullMessage },
		],
		stream: false,
	};
	const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(requestPayload),
	});
	if (!response.ok) {
		throw new Error(`Ollama model ${model} returned ${response.status} ${response.statusText}`);
	}
	const data = await response.json();
	if (!data.message || !data.message.content) {
		throw new Error(`Ollama model ${model} returned empty content`);
	}
	return data.message.content;
};

// Try Ollama with model fallback chain
const generateOllamaResponse = async (message, biomarkerData, messages) => {
	const fullMessage = buildFullMessage(message, biomarkerData, messages);
	for (const model of OLLAMA_MODELS) {
		try {
			console.log(`Trying Ollama model: ${model}`);
			const result = await tryOllamaModel(model, fullMessage);
			console.log(`Ollama model ${model} succeeded`);
			return result;
		} catch (err) {
			console.warn(`Ollama model ${model} failed: ${err.message}`);
		}
	}
	throw new Error("All Ollama models failed");
};

// Gemini fallback
const getChatbotResponse = async (message, biomarkerData, messages) => {
	const fullMessage = buildFullMessage(message, biomarkerData, messages);
	const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
	const model = genAI.getGenerativeModel({
		model: "gemini-1.5-flash",
		systemInstruction: SYSTEM_PROMPT,
	});
	const result = await model.generateContent(fullMessage);
	return result.response.text();
};

// Primary: Ollama; fallback: Gemini
const getResponse = async (message, biomarkerData, messages) => {
	try {
		return await generateOllamaResponse(message, biomarkerData, messages);
	} catch (ollamaErr) {
		console.warn("All Ollama models failed, falling back to Gemini:", ollamaErr.message);
		try {
			return await getChatbotResponse(message, biomarkerData, messages);
		} catch (geminiErr) {
			console.error("Gemini fallback also failed:", geminiErr.message);
			throw new Error("All LLM providers failed");
		}
	}
};

router.get("/conversation/:token/:conversationID", async (req, res) => {
	const { token, conversationID } = req.params;
	try {
		const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
		const userId = decoded._id;
		const messages = await getConversationByID(userId, conversationID);

		res.json(messages);
	} catch (error) {
		console.error("Error fetching conversation:", error);
		res.status(500).send({ message: "Error fetching conversation" });
	}
});

router.get("/user/:token", async (req, res) => {
    try {
        // Verify token
        const decoded = jwt.verify(req.params.token, process.env.JWTPRIVATEKEY);
        const userId = decoded._id;
        try {
            // Fetch conversations by user ID
            const conversations = await getConversationsByUser(userId);
            res.json({ conversations });
        } catch (error) {
            console.error("Error fetching conversations:", error);
            res.status(500).send({ message: "Error fetching conversations" });
        }
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            // Token expired, send 401 Unauthorized response
            return res.status(401).send({ message: "Token expired, please log in again" });
        } else {
            // Invalid token or other JWT verification errors
            return res.status(401).send({ message: "Invalid token" });
        }
    }
});

const trySaveMessage = async (...args) => {
    try {
        await saveMessage(...args);
    } catch (err) {
        console.warn("Redis saveMessage failed (chat still works):", err.message);
    }
};

router.post("/chat", async (req, res) => {
    const { token, message, messages, data, conversationID, topic } = req.body;

    try {
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        const userId = decoded._id;

        await trySaveMessage(userId, conversationID, "user", message, topic);
        const botResponse = await getResponse(message, data, messages);
        await trySaveMessage(userId, conversationID, "bot", botResponse, topic);
        res.json({ botResponse });
    } catch (error) {
        console.error("Chat error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

module.exports = router;
