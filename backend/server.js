import express from "express";
import cors from "cors";

// Routes
import healthRoutes from "./routes/health.js";
import downloadRoutes from "./routes/download.js";

// Middleware
import { errorHandler } from "./middleware/errorHandler.js";
import { logger } from "./utils/logger.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Security & Utility Middleware
app.use(cors({
  origin: '*', // Allows Vercel frontend
  methods: ['GET', 'OPTIONS'],
}));
app.use(express.json());

// Main Supported Routes
app.use("/api/health", healthRoutes);
app.use("/api/download", downloadRoutes); // Protects streaming via Rate Limiter

// Fallback for 404
app.use((req, res) => {
  res.status(404).json({ error: "not_found", message: "Endpoint not found" });
});

// Global Error Handler (Prevents server crashes)
app.use(errorHandler);

// Start the server safely
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Production Backend running on port ${PORT}`);
});

// Graceful shutdown protection
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', reason);
});
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception thrown:', error);
  // Give current reqs 5 seconds to finish, then cleanly shut down
  server.close(() => {
    process.exit(1);
  });
  setTimeout(() => process.exit(1), 5000).unref();
});
