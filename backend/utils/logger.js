export const logger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${msg}`, Object.keys(meta).length ? JSON.stringify(meta) : "");
  },
  error: (msg, error) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${msg}`, error?.message || error);
  },
  download: (req, songId) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || "UNKNOWN_IP";
    console.log(`[DOWNLOAD] ${new Date().toISOString()} - IP: ${ip} | Request: ${songId}`);
  }
};
