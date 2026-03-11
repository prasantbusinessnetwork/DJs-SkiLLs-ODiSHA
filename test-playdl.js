import play from "play-dl";

async function run() {
    try {
        const url = "https://www.youtube.com/watch?v=KsJ2-7cWTyg";
        console.log("Fetching info with play-dl for:", url);
        const info = await play.video_info(url);
        console.log("Title:", info.video_details.title);
    } catch (err) {
        console.error("ERROR CAUGHT:");
        console.error(err);
    }
}

run();
