const redis = require("../db");

const saveMessage = async (userId, conversationID, sender, message, topic) => {
    const key = `conversation:${userId}:${conversationID.trim()}`;
    const existing = await redis.get(key);
    let conversation = existing
        ? JSON.parse(existing)
        : { userId, conversationID: conversationID.trim(), messages: [], topic: topic || "" };
    conversation.messages.push({ sender, message, timestamp: new Date().toISOString() });
    await redis.set(key, JSON.stringify(conversation));
    await redis.sadd(`conversations:${userId}`, conversationID.trim());
};

const getConversationByID = async (userId, conversationID) => {
    const key = `conversation:${userId}:${conversationID.trim()}`;
    const data = await redis.get(key);
    return data ? JSON.parse(data).messages : [];
};

const getConversationsByUser = async (userId) => {
    const ids = await redis.smembers(`conversations:${userId}`);
    const conversations = await Promise.all(
        ids.map(async (id) => {
            const data = await redis.get(`conversation:${userId}:${id}`);
            return data ? JSON.parse(data) : null;
        })
    );
    return conversations.filter(Boolean);
};

module.exports = { saveMessage, getConversationByID, getConversationsByUser };
