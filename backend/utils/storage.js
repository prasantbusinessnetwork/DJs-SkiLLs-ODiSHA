import { S3Client, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// Object Storage Check (Supabase, R2, AWS S3)
// Example Configuration for Cloudflare R2 / AWS S3
const BUCKET_NAME = process.env.S3_BUCKET_NAME;

const createConfig = () => {
    if (!process.env.S3_ACCESS_KEY_ID) return null;
    return {
        region: process.env.S3_REGION || "auto",
        endpoint: process.env.S3_ENDPOINT, // e.g., https://<accountid>.r2.cloudflarestorage.com
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || "",
        }
    };
};

const s3Config = createConfig();
const s3Client = s3Config ? new S3Client(s3Config) : null;

/**
 * Validates if the song exists in object storage.
 * If yes, returns the S3 stream for the file.
 * If no, returns null.
 */
export const getStorageStream = async (songId) => {
  if (!s3Client || !BUCKET_NAME) return null; 

  try {
    const key = `${songId}.mp3`;
    
    // Check if it exists first
    await s3Client.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    
    // Return readable stream
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key
    });
    
    const response = await s3Client.send(command);
    return response.Body; 
  } catch (error) {
    // File not found or config error
    return null;
  }
};
