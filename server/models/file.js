const redis = require("../db");
const { randomUUID } = require("crypto");

const createFile = async (data) => {
	const id = randomUUID();
	const file = {
		id,
		userId: data.userId,
		fileName: data.fileName,
		fileUrl: data.fileUrl || "",
		uploadDate: new Date().toISOString(),
		description: data.description || "",
		testDate: data.testDate || new Date().toISOString(),
	};
	await redis.set(`file:${id}`, JSON.stringify(file));
	await redis.lpush(`files:${data.userId}`, id);
	return file;
};

const getFilesByUser = async (userId) => {
	const ids = await redis.lrange(`files:${userId}`, 0, -1);
	const files = await Promise.all(
		ids.map(async (id) => {
			const data = await redis.get(`file:${id}`);
			return data ? JSON.parse(data) : null;
		})
	);
	return files.filter(Boolean);
};

module.exports = { createFile, getFilesByUser };
