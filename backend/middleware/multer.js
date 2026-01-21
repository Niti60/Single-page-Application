const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`[Multer] Created uploads directory: ${uploadsDir}`);
}

// Configure storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log(`[Multer] Saving file to: ${uploadsDir}`);
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        // Generate unique filename with timestamp
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname) || '.tmp';
        const name = `${file.fieldname}-${uniqueSuffix}${ext}`;
        console.log(`[Multer] Generated filename: ${name}`);
        cb(null, name);
    }
});

    // File filter with better logging
    const fileFilter = (req, file, cb) => {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
        const logEntry = JSON.stringify({location:'multer.js:fileFilter',message:'MULTER FILE FILTER',data:{fieldname:file.fieldname,originalname:file.originalname,mimetype:file.mimetype,size:file.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n';
        fs.appendFileSync(logPath, logEntry);
        console.log(`[Multer] File filter check:`, {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size
        });

    // Accept images, audio, and video files
    const allowedMimes = [
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/gif',
        'image/webp',
        'audio/mpeg',
        'audio/mp3',
        'audio/mp4',
        'audio/wav',
        'audio/m4a',
        'audio/webm',
        'audio/ogg',
        'video/mp4',
        'video/webm',
        'video/quicktime',
        'application/octet-stream' // For cases where mime type is not set correctly
    ];

    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('image/') || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('video/')) {
        console.log(`[Multer] ✅ File type accepted: ${file.mimetype}`);
        cb(null, true);
    } else {
        console.error(`[Multer] ❌ File type rejected: ${file.mimetype}`);
        cb(new Error(`Invalid file type: ${file.mimetype}. Only images, audio, and video files are allowed.`), false);
    }
};

// Configure multer with better error handling
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit (increased for audio files)
    }
});

// Error handling middleware
const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        console.error('[Multer] MulterError:', err);
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                message: 'File too large. Maximum size is 50MB.',
                error: err.message 
            });
        }
        return res.status(400).json({ 
            message: 'File upload error',
            error: err.message 
        });
    } else if (err) {
        console.error('[Multer] Upload error:', err);
        return res.status(500).json({ 
            message: 'File upload failed',
            error: err.message 
        });
    }
    next();
};

module.exports = upload;
module.exports.handleMulterError = handleMulterError;
