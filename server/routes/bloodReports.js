const router = require("express").Router();
const jwt = require("jsonwebtoken");
const { createBloodReport, getBloodReportsByUser } = require("../models/bloodReport");

// Utility to decode token and retrieve user ID
const decodeToken = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY);
        return decoded._id;
    } catch (err) {
        throw new Error("Invalid token");
    }
};

router.get("/biomarkers", async (req, res) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const userId = decodeToken(token);
        const reports = await getBloodReportsByUser(userId);

        if (!reports || reports.length === 0) {
            return res.status(404).json({ message: "No reports found for user" });
        }

        const biomarkerMap = new Map();
        for (const report of reports) {
            for (const biomarker of report.biomarkers) {
                if (!biomarkerMap.has(biomarker.name)) {
                    biomarkerMap.set(biomarker.name, {
                        name: biomarker.name,
                        description: biomarker.description,
                        result: biomarker.result,
                        unit: biomarker.unit,
                        referenceRange: biomarker.referenceRange,
                        reportDate: report.reportDate,
                    });
                }
            }
        }

        res.json(Array.from(biomarkerMap.values()));
    } catch (error) {
        console.error("Error fetching biomarkers:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/latest/:token", async (req, res) => {
    const { token } = req.params;
    try {
        const userId = decodeToken(token);
        const reports = await getBloodReportsByUser(userId);

        if (!reports || reports.length === 0) {
            return res.status(404).json({ message: "No reports found for user" });
        }

        res.json(reports[0]);
    } catch (error) {
        console.error("Error fetching latest blood report:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/history/:token/:biomarker", async (req, res) => {
    const { token, biomarker } = req.params;
    try {
        const userId = decodeToken(token);
        const reports = await getBloodReportsByUser(userId);
        const sorted = [...reports].sort((a, b) => new Date(a.reportDate) - new Date(b.reportDate));

        const history = sorted
            .map((report) => {
                const biomarkerData = report.biomarkers.find(
                    (b) => b.name.toLowerCase() === biomarker.toLowerCase()
                );
                return biomarkerData
                    ? {
                          date: new Date(report.reportDate).toLocaleDateString("en-US"),
                          value: biomarkerData.result,
                          unit: biomarkerData.unit,
                          normalRange: biomarkerData.referenceRange,
                          description: biomarkerData.description,
                      }
                    : null;
            })
            .filter(Boolean);

        if (!history.length) {
            return res.status(404).json({ message: `No data found for biomarker: ${biomarker}` });
        }
        res.json(history);
    } catch (error) {
        console.error("Error fetching biomarker history:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.get("/llm/insights/:token", async (req, res) => {
    const { token } = req.params;
    try {
        const userId = decodeToken(token);
        const reports = await getBloodReportsByUser(userId);

        if (!reports.length) {
            return res.status(404).json({ message: "No reports found for user" });
        }

        const mostRecentReport = reports[0];
        const historicalData = {};

        reports.forEach((report) => {
            report.biomarkers.forEach((biomarker) => {
                if (!historicalData[biomarker.name]) {
                    historicalData[biomarker.name] = [];
                }
                historicalData[biomarker.name].push({
                    date: report.reportDate,
                    value: biomarker.result,
                    unit: biomarker.unit,
                });
            });
        });

        res.json({ mostRecent: mostRecentReport, historical: historicalData });
    } catch (error) {
        console.error("Error fetching biomarker insights:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

router.post("/", async (req, res) => {
    try {
        const token = req.header("Authorization")?.replace("Bearer ", "");
        if (!token) return res.status(401).json({ error: "Unauthorized" });

        const userId = decodeToken(token);
        const { reportDate, biomarkers } = req.body;

        if (!userId || !reportDate || !biomarkers) {
            return res.status(400).send({ message: "userId, reportDate, and biomarkers are required." });
        }

        const formattedBiomarkers = biomarkers.map((biomarker) => ({
            name: biomarker.testName,
            description: biomarker.description,
            result: biomarker.resultValue,
            unit: biomarker.unit,
            referenceRange: {
                min: biomarker.referenceRange.min,
                max: biomarker.referenceRange.max,
            },
            status: biomarker.status,
        }));

        const bloodReport = await createBloodReport({
            userId,
            reportDate: new Date(reportDate).toISOString(),
            biomarkers: formattedBiomarkers,
        });

        res.status(201).send({ message: "Blood report saved successfully!", bloodReport });
    } catch (error) {
        console.error("Error saving blood report:", error);
        res.status(500).send({ message: "Internal Server Error" });
    }
});

module.exports = router;
