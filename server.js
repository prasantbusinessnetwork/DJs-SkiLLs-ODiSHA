import express from "express"
import cors from "cors"
import { spawn } from "child_process"

const app = express()

// --- 1. MIDDLEWARE ---
app.use(cors({
  origin: "*"
}))
app.use(express.json())

// --- 2. HEALTH ENDPOINT ---
app.get("/api/health", (req, res) => {
  res.json({
    status: "server running"
  })
})

// --- 3. DOWNLOAD ENDPOINT ---
app.get("/api/download", async (req, res) => {
  const videoUrl = req.query.url

  if (!videoUrl) {
    return res.status(400).json({
      error: "Missing video URL (parameter 'url')"
    })
  }

  console.log(`[Job] Starting download for: ${videoUrl}`)

  try {
    // Set proper download headers
    res.setHeader("Content-Disposition", "attachment; filename=audio.mp3")
    res.setHeader("Content-Type", "audio/mpeg")

    /**
     * STABLE YT-DLP EXTRACTION
     * -f bestaudio: Get best audio quality
     * --extract-audio: Transcode to audio
     * --audio-format mp3: Ensure MP3 output
     * --audio-quality 0: Best VBR quality
     * --no-playlist: Don't download entire playlists
     * --extractor-args: Simulate mobile clients to bypass YouTube blocks
     * -o -: Pipe to stdout
     */
    const ytProcess = spawn("yt-dlp", [
      "-f", "bestaudio/best",
      "--extract-audio",
      "--audio-format", "mp3",
      "--audio-quality", "0",
      "--no-playlist",
      "--no-check-certificate",
      "--extractor-args", "youtube:player_client=android,ios",
      "-o", "-",
      videoUrl
    ])

    // Pipe the output directly to the response stream
    ytProcess.stdout.pipe(res)

    ytProcess.stderr.on("data", (data) => {
      const msg = data.toString()
      if (msg.includes("ERROR")) console.error(`[yt-dlp] ${msg}`)
    })

    ytProcess.on("error", (err) => {
      console.error("[Fatal Error]", err)
      if (!res.headersSent) {
        res.status(500).json({ error: "Internal Server Error during download initialization" })
      }
    })

    ytProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[Job] Process exited with code ${code}`)
      } else {
        console.log(`[Job] Successfully completed: ${videoUrl}`)
      }
    })

    // Handle client disconnect
    req.on("close", () => {
      try {
        ytProcess.kill("SIGKILL")
      } catch (e) {
        // Ignore
      }
    })

  } catch (err) {
    console.error("[Fatal Exception]", err)
    if (!res.headersSent) {
      res.status(500).json({
        error: "Server encountered a fatal error while processing download"
      })
    }
  }
})

// --- 4. SERVER START ---
const PORT = process.env.PORT || 3000
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 STABLE YT-DLP SERVER READY | PORT ${PORT}`)
})
