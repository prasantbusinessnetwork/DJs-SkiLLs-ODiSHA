import http from 'http';
import fs from 'fs';

const TEST_VIDEO_ID = 'ekGVFiTL_SU'; // Use a small/static ID
const HOST = process.env.TEST_HOST || 'http://localhost:3000';

async function runSmokeTest() {
    console.log(`🚀 Starting Smoke Test for: ${HOST}`);

    const url = `${HOST}/api/download?videoId=${TEST_VIDEO_ID}&title=SmokeTest`;

    console.log(`[Test] Requesting: ${url}`);

    const start = Date.now();

    http.get(url, (res) => {
        const { statusCode, headers } = res;

        console.log(`[Test] Status Code: ${statusCode}`);
        console.log(`[Test] Content-Disposition: ${headers['content-disposition']}`);
        console.log(`[Test] Content-Type: ${headers['content-type']}`);

        if (statusCode !== 200) {
            console.error(`❌ FAILED: Expected 200, got ${statusCode}`);
            process.exit(1);
        }

        if (!headers['content-disposition'] || !headers['content-disposition'].includes('attachment')) {
            console.error('❌ FAILED: Missing valid Content-Disposition');
            process.exit(1);
        }

        let dataLen = 0;
        res.on('data', (chunk) => {
            dataLen += chunk.length;
            if (dataLen > 0 && dataLen % (1024 * 1024) === 0) {
                console.log(`[Test] Received ${dataLen / (1024 * 1024)} MB...`);
            }
        });

        res.on('end', () => {
            const duration = (Date.now() - start) / 1000;
            console.log(`\n✅ SUCCESS! Received ${dataLen} bytes in ${duration}s`);
            if (dataLen < 100000) {
                console.error('❌ FAILED: Received too little data, stream might have cut off.');
                process.exit(1);
            }
            process.exit(0);
        });

    }).on('error', (e) => {
        console.error(`❌ FAILED: Network error - ${e.message}`);
        process.exit(1);
    });
}

runSmokeTest();
