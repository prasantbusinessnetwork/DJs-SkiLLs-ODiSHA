import express from "express";

const router = express.Router();

// Health Monitoring Endpoint
router.get("/", (req, res) => {
  res.json({
    status: "ok",
    uptime: "running",
    memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
    timestamp: new Date().toISOString()
  });
});

export default router;
