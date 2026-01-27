// CRITICAL: Load dotenv FIRST before any other imports
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try multiple paths to find .env file
const possiblePaths = [
  path.join(__dirname, '..', '.env'),        // From backend/server.js -> project root
  path.join(process.cwd(), '.env'),          // Current working directory
  path.join(__dirname, '.env'),             // Backend directory (fallback)
];

let envLoaded = false;
let loadedPath = null;

console.log('📁 Attempting to load .env file...');
console.log('   Current working directory:', process.cwd());
console.log('   __dirname:', __dirname);

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    console.log(`   ✅ Found .env at: ${envPath}`);
    const result = dotenv.config({ path: envPath, override: true });
    if (!result.error) {
      envLoaded = true;
      loadedPath = envPath;
      console.log(`   ✅ Successfully loaded .env from: ${envPath}`);
      break;
    } else {
      console.log(`   ⚠️  Error loading from ${envPath}:`, result.error.message);
    }
  } else {
    console.log(`   ❌ Not found: ${envPath}`);
  }
}

// If dotenv didn't load, try manual parsing
if (!envLoaded) {
  console.log('⚠️  dotenv.config() failed, trying manual parsing...');
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      try {
        const content = fs.readFileSync(envPath, 'utf8');
        const lines = content.split('\n');
        let parsedCount = 0;
        
        lines.forEach(line => {
          const trimmed = line.trim();
          // Skip comments and empty lines
          if (trimmed && !trimmed.startsWith('#')) {
            const [key, ...valueParts] = trimmed.split('=');
            if (key && valueParts.length > 0) {
              const value = valueParts.join('=').trim();
              // Remove quotes if present
              const cleanValue = value.replace(/^["']|["']$/g, '');
              process.env[key.trim()] = cleanValue;
              parsedCount++;
            }
          }
        });
        
        if (parsedCount > 0) {
          console.log(`   ✅ Manually parsed ${parsedCount} variables from: ${envPath}`);
          envLoaded = true;
          loadedPath = envPath;
          break;
        }
      } catch (err) {
        console.log(`   ❌ Error reading ${envPath}:`, err.message);
      }
    }
  }
}

if (!envLoaded) {
  console.error('❌ Failed to load .env file from any location!');
  console.error('   Please ensure .env file exists in the project root directory.');
} else {
  console.log(`✅ Environment file loaded successfully from: ${loadedPath}`);
}

// Debug: Check what was actually loaded
console.log('\n🔍 Environment variables check:');
const cloudinaryCheck = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'SET (' + process.env.CLOUDINARY_CLOUD_NAME.substring(0, 4) + '...)' : 'MISSING',
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'SET (' + process.env.CLOUDINARY_API_KEY.substring(0, 4) + '...)' : 'MISSING',
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'SET (' + process.env.CLOUDINARY_API_SECRET.substring(0, 4) + '...)' : 'MISSING',
};
console.log('   Cloudinary vars:', cloudinaryCheck);

// Show ALL env vars that contain CLOUD (case insensitive)
const allCloudVars = Object.keys(process.env).filter(k => k.toUpperCase().includes('CLOUD'));
console.log('   All CLOUD* env vars:', allCloudVars.length > 0 ? allCloudVars.join(', ') : 'NONE');
console.log('');

// Now import other modules (they can safely use process.env)
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Routes - Tracking Backend (Write Only)
const trackingRoutes = require('./routes/trackingRoutes');
const captureRoutes = require('./routes/captureRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

/* -------------------------------------------------------------------------- */
/*                          ENV VALIDATION (EARLY)                             */
/* -------------------------------------------------------------------------- */
if (!process.env.MONGO_URI) {
  console.error('❌ MONGO_URI is missing in environment');
  process.exit(1);
}

// Check Cloudinary environment variables
const cloudinaryVars = {
  CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
};

const missingVars = Object.entries(cloudinaryVars)
  .filter(([key, value]) => !value)
  .map(([key]) => key);

if (missingVars.length > 0) {
  console.error('❌ Cloudinary env vars missing:', missingVars.join(', '));
  console.error('📋 Available env vars:', Object.keys(process.env).filter(k => k.includes('CLOUD')).join(', ') || 'NONE');
  process.exit(1);
}

/* -------------------------------------------------------------------------- */
/*                                MIDDLEWARE                                  */
/* -------------------------------------------------------------------------- */

// CORS - Allow all origins (testing mode)
app.use(
  cors({
    origin: true, // Allow all origins
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

/* -------------------------------------------------------------------------- */
/*                              DATABASE                                      */
/* -------------------------------------------------------------------------- */

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
  })
  .catch((err) => {
    console.error('❌ MongoDB connection failed:', err);
    process.exit(1);
  });

/* -------------------------------------------------------------------------- */
/*                                ROUTES                                      */
/* -------------------------------------------------------------------------- */

// Root
app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'backend',
  });
});

// Health
app.get('/health', (_req, res) => {
  res.json({
    status: 'healthy',
    db:
      mongoose.connection.readyState === 1
        ? 'connected'
        : 'disconnected',
  });
});

// Tracking Routes (Write Only)
app.use(trackingRoutes);
app.use(captureRoutes);

/* -------------------------------------------------------------------------- */
/*                         GLOBAL ERROR HANDLER                                */
/* -------------------------------------------------------------------------- */

app.use((err, req, res, next) => {
  console.error('🔥 Unhandled error:', err);

  // Multer file size / format errors
  if (err.name === 'MulterError') {
    return res.status(400).json({
      message: err.message,
    });
  }

  res.status(500).json({
    message: 'Internal server error',
  });
});

/* -------------------------------------------------------------------------- */
/*                               SERVER                                       */
/* -------------------------------------------------------------------------- */

app
  .listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 http://localhost:${PORT}`);
  })
  .on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`❌ Port ${PORT} already in use`);
    } else {
      console.error('❌ Server error:', err);
    }
    process.exit(1);
  });
