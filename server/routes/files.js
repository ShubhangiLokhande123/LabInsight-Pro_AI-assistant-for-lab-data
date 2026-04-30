const router = require("express").Router();
const { createFile, getFilesByUser } = require("../models/file");
const multer = require("multer");
const jwt = require("jsonwebtoken");
const pdf = require("pdf-parse");
const fs = require("fs");
const path = require("path");

const biomarkersPath = path.resolve(__dirname, "../data/biomarkers.json");
const biomarkersData = JSON.parse(fs.readFileSync(biomarkersPath, "utf-8"));

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 15 * 1024 * 1024 },
});

router.get("/:token", async (req, res) => {
    try {
        const decoded = jwt.verify(req.params.token, process.env.JWTPRIVATEKEY);
        const userId = decoded._id;
        const files = await getFilesByUser(userId);
        res.json(files);
    } catch (error) {
        res.status(500).json({ message: "Error fetching files" });
    }
});

const extractBiomarkerResults = async (pdfBuffer) => {
    const pdfData = await pdf(pdfBuffer);
    const text = pdfData.text;
    return parseBiomarkers(text);
};

const parseBiomarkers = (text) => {
    const biomarkers = [];
    const lines = text.split("\n");

    const sortedBiomarkers = Object.entries(biomarkersData).sort(
        ([a], [b]) => b.length - a.length
    );

    sortedBiomarkers.forEach(([biomarker, biomarkerData]) => {
        const aliasPatterns = [biomarker, ...(biomarkerData.aliases || [])]
            .map((alias) => `\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`)
            .join("|");

        const regex = new RegExp(`(${aliasPatterns}).*?([0-9.]+)(?!\\s*-\\s*[0-9.])`, "i");

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const match = line.match(regex);
            if (match) {
                let resultValue = parseFloat(match[2]);

                if (isNaN(resultValue) || resultValue < 0 || resultValue > 1e6) {
                    continue;
                }

                const minRef = biomarkerData.referenceRange.min;
                if (resultValue < minRef / 100) {
                    const scalingFactor = Math.pow(
                        10,
                        Math.floor(Math.log10(minRef)) - Math.floor(Math.log10(resultValue))
                    );
                    resultValue *= scalingFactor;
                }

                biomarkers.push({
                    testName: biomarker,
                    description: biomarkerData.description,
                    resultValue,
                    unit: biomarkerData.unit,
                    referenceRange: biomarkerData.referenceRange,
                    status: getBiomarkerStatus(resultValue, biomarkerData.referenceRange),
                });

                break;
            }
        }
    });

    return biomarkers;
};

const getBiomarkerStatus = (result, referenceRange) => {
    if (result < referenceRange.min) return "Low";
    if (result > referenceRange.max) return "High";
    return "Normal";
};

router.post("/", upload.single("file"), async (req, res) => {
    try {
        const authHeader = req.headers["authorization"];
        if (!authHeader) return res.status(401).send({ message: "Authorization token is required." });

        const token = authHeader.replace("Bearer ", "");
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        const userId = decoded._id;

        if (!req.file) return res.status(400).send({ message: "File is required." });

        const fileName = `${userId}_${Date.now()}_${req.file.originalname}`;

        let biomarkers = [];
        try {
            biomarkers = await extractBiomarkerResults(req.file.buffer);
        } catch (error) {
            console.error("Error parsing PDF:", error);
            return res.status(500).send({ message: "Error processing PDF data." });
        }

        await createFile({
            userId,
            fileName,
            fileUrl: "",
            description: req.body.description,
            testDate: req.body.testDate,
        });

        res.status(201).send({
            message: "File uploaded and biomarker results extracted successfully!",
            biomarkers,
        });
    } catch (error) {
        console.error("Internal Server Error:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

module.exports = router;
