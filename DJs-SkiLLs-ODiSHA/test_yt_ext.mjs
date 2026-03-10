import * as youtubeExt from "youtube-ext";
import fs from "fs";
import ffmpegStatic from "ffmpeg-static";
import { spawn } from "child_process";

async function download() {
    try {
        const videoId = "KsJ2-7cWTyg";
        const filePath = `ytext_${videoId}.mp3`;

        console.log("Starting youtube-ext download for", videoId);
        let stream = await youtubeExt.createStream(videoId);
        // actually, let's see available exports
        console.log(Object.keys(youtubeExt));

    } catch (e) {
        console.log("Error:", e);
    }
}

download();
