import ffmpegStatic from "ffmpeg-static";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ytDlpPath = path.join(__dirname, "yt-dlp.exe");

const videoId = "KsJ2-7cWTyg";
const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
const ffmpegPath = ffmpegStatic;
const filePath = `${videoId}.mp3`;

console.log("ytDlpPath:", ytDlpPath);
console.log("ffmpegPath:", ffmpegPath);

const ytDlpProc = spawn(ytDlpPath, [
    "-x",
    "--audio-format", "mp3",
    "--audio-quality", "192K",
    "--ffmpeg-location", ffmpegPath,
    "-o", filePath,
    videoUrl
]);

ytDlpProc.stderr.on("data", (data) => {
    console.log("STDERR:", data.toString());
});
ytDlpProc.stdout.on("data", (data) => {
    console.log("STDOUT:", data.toString());
});

ytDlpProc.on("close", (code) => {
    console.log("EXIT:", code);
});
