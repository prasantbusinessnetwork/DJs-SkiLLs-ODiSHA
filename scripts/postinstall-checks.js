/**
 * Ensure yt-dlp is available in PATH during postinstall
 */
import { execSync } from 'child_process';
try {
  execSync('yt-dlp --version', { stdio: 'inherit' });
  console.log('yt-dlp present');
} catch (e) {
  console.warn('yt-dlp not found in postinstall; ensure runtime installs it (Dockerfile installs yt-dlp).');
}
