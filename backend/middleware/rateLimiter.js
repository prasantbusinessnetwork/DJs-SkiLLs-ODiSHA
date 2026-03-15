import rateLimit from "express-rate-limit";

// 100 downloads per IP per day to prevent abuse
// Memory safe for up to 10k users/day per Railway container instance
export const downloadLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 100, // Limit each IP to 100 requests per `window`
  message: {
    error: "rate_limit_exceeded",
    message: "You have exceeded your daily download limit. Please try again tomorrow."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
