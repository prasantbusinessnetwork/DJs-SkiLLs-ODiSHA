const YOUTUBE_API_KEY = "AIzaSyCHHK85TvMyyydXu35r6z18kMJHcpuheQA";
const KNOWN_VIDEO_ID = "KsJ2-7cWTyg";

async function test() {
  try {
    console.log("Testing video info fetch...");
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${KNOWN_VIDEO_ID}&key=${YOUTUBE_API_KEY}`
    );
    const data = await res.json();
    console.log("Video Data:", JSON.stringify(data, null, 2));

    if (data.error) {
      console.error("API Error:", data.error.message);
      return;
    }

    if (!data.items?.length) {
      console.error("No items found for video ID:", KNOWN_VIDEO_ID);
      return;
    }

    const channelId = data.items[0].snippet.channelId;
    console.log("Found Channel ID:", channelId);

    console.log("Testing search fetch...");
    const searchRes = await fetch(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&channelId=${channelId}&order=date&type=video&maxResults=5&key=${YOUTUBE_API_KEY}`
    );
    const searchData = await searchRes.json();
    console.log("Search Data:", JSON.stringify(searchData, null, 2));
    
    if (searchData.error) {
      console.error("Search API Error:", searchData.error.message);
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

test();
