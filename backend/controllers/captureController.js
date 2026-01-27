const Link = require("../models/link");
const { uploadToCloudinary } = require("../utils/uploadToCloudinary");

/**
 * Helper: get latest log entry. Throws if none exists to avoid creating new logs.
 */
function getLatestLogOrThrow(link, pageId) {
  if (!link.logs || link.logs.length === 0) {
    throw new Error(
      `No log entry exists for pageId=${pageId}. Track a visit before uploading media.`
    );
  }
  return link.logs[link.logs.length - 1];
}

/**
 * POST /api/capture/image/:pageId
 * Accepts multipart/form-data with a single "file" field (image).
 * Uploads to Cloudinary and attaches secure_url to latest log.captures.image.
 */
const captureImage = async (req, res) => {
  try {
    const { pageId } = req.params;

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const link = await Link.findOne({ pageId });
    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Link not found",
      });
    }

    // Upload to Cloudinary as image
    const cloudinaryUrl = await uploadToCloudinary(
      file.path,
      "image",
      "captured_media"
    );

    if (
      !cloudinaryUrl ||
      typeof cloudinaryUrl !== "string" ||
      !cloudinaryUrl.startsWith("http")
    ) {
      return res.status(500).json({
        success: false,
        message: "Upload succeeded but invalid Cloudinary URL returned",
      });
    }

    // Attach to latest log entry (append-only, do NOT create new log here)
    let lastLog;
    try {
      lastLog = getLatestLogOrThrow(link, pageId);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!lastLog.captures) {
      lastLog.captures = {};
    }

    lastLog.captures.image = cloudinaryUrl;
    link.markModified("logs");
    await link.save();

    return res.status(200).json({
      success: true,
      url: cloudinaryUrl,
      secure_url: cloudinaryUrl,
      imageUrl: cloudinaryUrl,
      updatedLog: lastLog,
    });
  } catch (error) {
    console.error("[captureImage] ❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading image",
      error: error.message,
    });
  }
};

/**
 * POST /api/capture/audio/:pageId
 * Accepts multipart/form-data with a single "file" field (audio).
 * Uploads to Cloudinary and attaches secure_url to latest log.captures.audio.
 */
const captureAudio = async (req, res) => {
  try {
    const { pageId } = req.params;

    const file = req.file;
    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const link = await Link.findOne({ pageId });
    if (!link) {
      return res.status(404).json({
        success: false,
        message: "Link not found",
      });
    }

    // Upload to Cloudinary as audio (stored as video resource type)
    const cloudinaryUrl = await uploadToCloudinary(
      file.path,
      "audio",
      "captured_media"
    );

    if (
      !cloudinaryUrl ||
      typeof cloudinaryUrl !== "string" ||
      !cloudinaryUrl.startsWith("http")
    ) {
      return res.status(500).json({
        success: false,
        message: "Upload succeeded but invalid Cloudinary URL returned",
      });
    }

    // Attach to latest log entry (append-only, do NOT create new log here)
    let lastLog;
    try {
      lastLog = getLatestLogOrThrow(link, pageId);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message,
      });
    }

    if (!lastLog.captures) {
      lastLog.captures = {};
    }

    lastLog.captures.audio = cloudinaryUrl;
    link.markModified("logs");
    await link.save();

    return res.status(200).json({
      success: true,
      url: cloudinaryUrl,
      secure_url: cloudinaryUrl,
      audioUrl: cloudinaryUrl,
      updatedLog: lastLog,
    });
  } catch (error) {
    console.error("[captureAudio] ❌ Error:", error);
    return res.status(500).json({
      success: false,
      message: "Error uploading audio",
      error: error.message,
    });
  }
};

module.exports = {
  captureImage,
  captureAudio,
};

