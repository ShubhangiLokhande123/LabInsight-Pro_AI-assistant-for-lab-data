require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
require("./db"); // Initialize Redis connection
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const fileRoutes = require("./routes/files");
const conversationRoutes = require("./routes/conversations");
const bloodReportRoutes = require("./routes/bloodReports");

// middlewares
app.use(express.json());
app.use(cors());

// routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/conversations", conversationRoutes);
app.use("/api/bloodreport", bloodReportRoutes);

const port = process.env.PORT || 8080;
app.listen(port, console.log(`Listening on port ${port}...`));
