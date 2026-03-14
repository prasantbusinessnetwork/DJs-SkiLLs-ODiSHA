# YouTube Cookie & Token Extractor for DJs SkiLLs ODiSHA
# Run this on your Windows PC to get the perfect values for Railway

$ErrorActionPreference = "SilentlyContinue"
Write-Host "--- DJs SkiLLs ODiSHA Tool ---" -ForegroundColor Cyan
Write-Host "Extracting and Formatting YouTube Auth..." -ForegroundColor Yellow

$cookiesPath = "$env:TEMP\yt_cookies.txt"
Write-Host "`nStep 1: Exporting cookies from Chrome..." -ForegroundColor Gray
# This requires yt-dlp to be installed on your local PC
& yt-dlp --cookies-from-browser chrome --cookies $cookiesPath --version > $null

if (Test-Path $cookiesPath) {
    $data = Get-Content $cookiesPath -Raw
    $sanitized = $data -replace "`n", "\n"
    Write-Host "`n--- COPY THIS FOR 'YOUTUBE_COOKIES' IN RAILWAY ---" -ForegroundColor Green
    Write-Output $sanitized
    Write-Host "------------------------------------------------" -ForegroundColor Green
} else {
    Write-Host "Error: Could not extract cookies. Make sure Chrome is installed and you are logged into YouTube." -ForegroundColor Red
}

Write-Host "`nTip: In Railway, paste the above value EXACTLY as it is (including the \n characters)." -ForegroundColor Cyan
Remove-Item $cookiesPath
Read-Host "`nPress Enter to close"
