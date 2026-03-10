import ytdl from "@distube/ytdl-core";
import fs from "fs";
import ffmpegStatic from "ffmpeg-static";
import { spawn } from "child_process";

const videoId = "KsJ2-7cWTyg";
const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
const filePath = `${videoId}.mp3`;

console.log("Starting download for", videoId);

const audioStream = ytdl(videoUrl, {
    quality: "highestaudio",
    filter: "audioonly",
    requestOptions: {
        headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" }
    }
});

const ffmpegPath = ffmpegStatic;
const ffmpegProc = spawn(ffmpegPath, [
    "-i", "pipe:0",
    "-vn",
    "-ab", "192k",
    "-ar", "44100",
    "-f", "mp3",
    filePath
]);

audioStream.pipe(ffmpegProc.stdin);

audioStream.on("error", (err) => {
    console.error("ytdl error:", err);
});

ffmpegProc.stderr.on("data", (data) => {
    // console.log("ffmpeg:", data.toString());
});

ffmpegProc.on("error", (err) => {
    console.error("ffmpeg error:", err);
});

ffmpegProc.on("close", (code) => {
    console.log("ffmpeg close code:", code);
    if (fs.existsSync(filePath)) {
        console.log("File exists, size:", fs.statSync(filePath).size);
    } else {
        console.log("File does not exist");
    }
});
