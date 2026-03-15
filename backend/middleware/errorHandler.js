import { logger } from "../utils/logger.js";

// Global Error Catching - Prevents Node.js from Crashing
export const errorHandler = (err, req, res, next) => {
  logger.error("Unhandled API Error", err);

  if (!res.headersSent) {
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: "internal_server_error",
      message: "An unexpected error occurred while processing your request. Please try again later.",
      status: "failed"
    });
  }
};
