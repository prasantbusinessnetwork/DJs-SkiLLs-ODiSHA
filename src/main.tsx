import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const container = document.getElementById("root");
if (container) {
  createRoot(container).render(<App />);
}

// Keep Railway backend alive — ping every 4 minutes
const BACKEND = "https://djs-skills-odisha-production.up.railway.app";
setInterval(() => {
  fetch(`${BACKEND}/health`, { method: 'GET' })
    .catch(() => {}); // Silent fail — just keeping alive
}, 4 * 60 * 1000);
