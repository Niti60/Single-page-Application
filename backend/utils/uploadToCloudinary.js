const { v2: cloudinary } = require('cloudinary');
const fs = require('fs');

// Configure Cloudinary with validation
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

if (!cloudName || !apiKey || !apiSecret) {
  console.error('[Cloudinary] ❌ Missing Cloudinary credentials!');
  console.error('[Cloudinary] CLOUDINARY_CLOUD_NAME:', cloudName ? 'SET' : 'MISSING');
  console.error('[Cloudinary] CLOUDINARY_API_KEY:', apiKey ? 'SET' : 'MISSING');
  console.error('[Cloudinary] CLOUDINARY_API_SECRET:', apiSecret ? 'SET' : 'MISSING');
  throw new Error('Cloudinary credentials are missing. Please check your .env file.');
}

cloudinary.config({
  cloud_name: cloudName,
  api_key: apiKey,
  api_secret: apiSecret,
});

console.log('[Cloudinary] ✅ Configured successfully');

/**
 * Upload file to Cloudinary
 */
const uploadToCloudinary = async (
  filePath,
  fileType,
  folder = 'captured_media'
) => {
  const logPath = require('path').join(__dirname, '..', '..', '.cursor', 'debug.log');
  const logEntry = JSON.stringify({location:'uploadToCloudinary.js:28',message:'uploadToCloudinary ENTRY',data:{filePath,fileType,folder,fileExists:fs.existsSync(filePath)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
  fs.appendFileSync(logPath, logEntry);
  try {
    console.log(`[Cloudinary] Starting upload...`);
    console.log(`[Cloudinary] File path: ${filePath}`);
    console.log(`[Cloudinary] File type: ${fileType}`);
    console.log(`[Cloudinary] Folder: ${folder}`);
    
    if (!fs.existsSync(filePath)) {
      const logEntry2 = JSON.stringify({location:'uploadToCloudinary.js:40',message:'uploadToCloudinary FILE NOT FOUND',data:{filePath},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
      fs.appendFileSync(logPath, logEntry2);
      throw new Error(`File not found: ${filePath}`);
    }

    const fileStats = fs.statSync(filePath);
    console.log(`[Cloudinary] File size: ${fileStats.size} bytes`);

    const resourceType = fileType === 'audio' ? 'video' : 'image';

    console.log(`[Cloudinary] Uploading to Cloudinary (resource_type: ${resourceType})...`);
    const uploadOptions = {
      upload_preset: 'frontend_capture', // CRITICAL: Using preset 'frontend_capture' as specified
      folder,
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
      timeout: 60000,
    };
    
    console.log(`[Cloudinary] Upload options:`, JSON.stringify(uploadOptions, null, 2));
    console.log(`[Cloudinary] ✅ Using preset: frontend_capture`);
    
    const result = await cloudinary.uploader.upload(filePath, uploadOptions);
    
    // CRITICAL: Validate result has secure_url
    if (!result || !result.secure_url) {
      throw new Error(`Cloudinary upload succeeded but no secure_url in response. Result: ${JSON.stringify(result)}`);
    }

        console.log(`[Cloudinary] ✅ Upload successful!`);
        console.log(`[Cloudinary] Public ID: ${result.public_id}`);
        console.log(`[Cloudinary] Secure URL: ${result.secure_url}`);
        
        // CRITICAL: Double-check URL is valid before returning
        const secureUrl = result.secure_url;
        const logPath = require('path').join(__dirname, '..', '..', '.cursor', 'debug.log');
        const logEntry = JSON.stringify({location:'uploadToCloudinary.js:67',message:'uploadToCloudinary SUCCESS',data:{secureUrl:secureUrl?.substring(0,60),isValid:secureUrl && typeof secureUrl === 'string' && secureUrl.startsWith('http'),publicId:result.public_id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
        fs.appendFileSync(logPath, logEntry);
        if (!secureUrl || typeof secureUrl !== 'string' || !secureUrl.startsWith('http')) {
          throw new Error(`Invalid secure_url returned from Cloudinary: ${secureUrl}`);
        }

    // Clean up local file
    try {
      fs.unlinkSync(filePath);
      console.log(`[Cloudinary] Local file deleted: ${filePath}`);
    } catch (deleteError) {
      console.warn(`[Cloudinary] Warning: Could not delete local file:`, deleteError.message);
    }

    console.log(`[Cloudinary] ✅ Returning URL: ${secureUrl.substring(0, 60)}...`);
    return secureUrl;

  } catch (error) {
    console.error(`[Cloudinary] ❌ Upload failed:`, error.message);
    console.error(`[Cloudinary] Error details:`, {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    
    // Clean up local file even on error
    if (fs.existsSync(filePath)) {
      try {
        fs.unlinkSync(filePath);
        console.log(`[Cloudinary] Local file deleted after error`);
      } catch (deleteError) {
        console.warn(`[Cloudinary] Could not delete file after error`);
      }
    }
    
    throw error;
  }
};

module.exports = { uploadToCloudinary };
