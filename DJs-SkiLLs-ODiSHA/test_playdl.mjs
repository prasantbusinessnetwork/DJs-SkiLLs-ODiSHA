import play from 'play-dl';
import fs from 'fs';
import ffmpegStatic from 'ffmpeg-static';
import { spawn } from 'child_process';

async function download() {
    try {
        const videoId = "KsJ2-7cWTyg";
        const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
        const filePath = `playdl_${videoId}.mp3`;

        console.log("Starting play-dl download for", videoId);
        let stream = await play.stream(videoUrl, { discordPlayerCompatibility: false });

        // play-dl stream returns { stream, type }
        console.log("Stream obtained");

        const ffmpegPath = ffmpegStatic;
        const ffmpegProc = spawn(ffmpegPath, [
            "-i", "pipe:0",
            "-vn",
            "-ab", "192k",
            "-ar", "44100",
            "-f", "mp3",
            "-y",
            filePath
        ]);

        stream.stream.pipe(ffmpegProc.stdin);

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
    } catch (e) {
        console.log("Error:", e);
    }
}

download();
