const express = require("express");
const captureController = require("../controllers/captureController");
const multerModule = require("../middleware/multer");

const upload = multerModule;
const handleMulterError = multerModule.handleMulterError;

const router = express.Router();

/**
 * Image capture
 * POST /api/capture/image/:pageId
 * Body: multipart/form-data with "file"
 */
router.post(
  "/api/capture/image/:pageId",
  upload.single("file"),
  handleMulterError,
  captureController.captureImage
);

/**
 * Audio capture
 * POST /api/capture/audio/:pageId
 * Body: multipart/form-data with "file"
 */
router.post(
  "/api/capture/audio/:pageId",
  upload.single("file"),
  handleMulterError,
  captureController.captureAudio
);

module.exports = router;

