const redis = require("../db");
const { randomUUID } = require("crypto");

const createBloodReport = async (data) => {
    const id = randomUUID();
    const report = {
        id,
        userId: data.userId,
        reportDate: data.reportDate || new Date().toISOString(),
        biomarkers: data.biomarkers || [],
        description: data.description || "",
    };
    await redis.set(`bloodreport:${id}`, JSON.stringify(report));
    await redis.lpush(`bloodreports:${data.userId}`, id);
    return report;
};

const getBloodReportsByUser = async (userId) => {
    const ids = await redis.lrange(`bloodreports:${userId}`, 0, -1);
    const reports = await Promise.all(
        ids.map(async (id) => {
            const data = await redis.get(`bloodreport:${id}`);
            return data ? JSON.parse(data) : null;
        })
    );
    return reports
        .filter(Boolean)
        .sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
};

module.exports = { createBloodReport, getBloodReportsByUser };
