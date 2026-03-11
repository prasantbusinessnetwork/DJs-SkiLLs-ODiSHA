import ytdl from "@distube/ytdl-core";

async function run() {
    try {
        const url = "https://www.youtube.com/watch?v=KsJ2-7cWTyg";
        console.log("Fetching info for:", url);
        const info = await ytdl.getInfo(url);
        console.log("Title:", info.videoDetails.title);
        const audioFormats = ytdl.filterFormats(info.formats, "audioonly");
        console.log("Audio Formats:", audioFormats.length);
    } catch (err) {
        console.error("ERROR CAUGHT:");
        console.error(err);
    }
}

run();
