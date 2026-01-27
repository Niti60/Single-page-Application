# Tracking Backend (Project 1) - Write Only

## Overview

This backend is a **write-only tracking service** that collects visitor analytics data and saves it to MongoDB. It does NOT provide dashboard or analytics viewing capabilities - that's handled by Project 2.

## Purpose

When someone visits a tracking URL like:
- `/page/:pageId`
- `/:number`

The backend:
1. Finds the Link document in MongoDB
2. Captures full visitor data (IP, device, location, etc.)
3. Pushes a new log entry into `Link.logs[]` (append-only)
4. Uploads media to Cloudinary (optional)
5. Saves permission states (optional)

## API Endpoints

### 1. Track Visit

**GET** `/page/:pageId`

**Alternative:** **GET** `/:number` (looks up pageId by number)

**Description:** Main tracking endpoint that captures visitor data and saves to MongoDB.

**What it does:**
- Detects IP address (handles proxies/load balancers)
- Detects referrer
- Detects user agent
- Parses browser/device/OS from user agent
- Fetches location info from IP (ipapi.co/ipinfo.io)
- Creates new log entry
- Pushes to `Link.logs[]` (never overwrites)

**Response:**
```json
{
  "success": true,
  "message": "Visit tracked successfully",
  "logId": "507f1f77bcf86cd799439011"
}
```

---

### 2. Capture Media

**POST** `/api/capture/:pageId`

**Description:** Upload image/audio file to Cloudinary and attach URL to latest log entry.

**Request:**
- Content-Type: `multipart/form-data`
- Body: `file` (image or audio file)

**What it does:**
- Receives file via Multer middleware
- Uploads to Cloudinary
- Saves Cloudinary URL to `logs[latest].captures.image` or `logs[latest].captures.audio`
- Never overwrites existing captures

**Response:**
```json
{
  "success": true,
  "url": "https://res.cloudinary.com/...",
  "type": "image"
}
```

---

### 3. Save Permissions

**POST** `/api/permissions/:pageId`

**Description:** Save permission states to latest log entry.

**Request Body:**
```json
{
  "permissions": {
    "location": "granted",
    "cameraview": "denied",
    "contacts": "not_requested",
    "media": "granted",
    "notification": "granted"
  },
  "logId": "507f1f77bcf86cd799439011" // Optional: specific log entry
}
```

**What it does:**
- Saves permission states to `logs[latest].permissions`
- Only accepts valid enum values: `granted`, `denied`, `not_requested`, `blocked`
- Can target specific log entry via `logId`

**Response:**
```json
{
  "success": true,
  "message": "Permissions saved successfully"
}
```

---

## Project Structure

```
backend/
├── server.js                    # Main server file
├── routes/
│   └── trackingRoutes.js         # ✅ Tracking routes (WRITE ONLY)
├── controllers/
│   └── trackingController.js    # ✅ Tracking controller
├── utils/
│   ├── getIpDetails.js          # ✅ IP location fetching
│   ├── deviceParser.js          # ✅ User agent parsing
│   └── uploadToCloudinary.js    # ✅ Cloudinary uploads
├── models/
│   └── link.js                  # ✅ Link schema (OWNED by Project 1)
└── middleware/
    └── multer.js                # ✅ File upload middleware
```

## Disallowed Features

❌ **Dashboard routes**  
❌ **GET /links** (list all links)  
❌ **Analytics summary APIs**  
❌ **User login/admin panel**  
❌ **GET /api/links/:id** (read link)  
❌ **POST /api/links** (create link)  
❌ **DELETE /api/links/:id** (delete link)  

**Only tracking + logging is allowed.**

## Schema Ownership

Project 1 **OWNS** the Link model structure (`backend/models/link.js`).

All writes MUST match this schema exactly. Project 2 will only read.

## Strict Tracking Logic

Every visit:
- ✅ Creates a new log entry
- ✅ Appends it into `Link.logs[]`
- ✅ Never overwrites old logs
- ✅ Maintains full history

## Data Flow

### Visit Tracking Flow:
```
User visits /page/:pageId
  ↓
Backend detects IP, referrer, user agent
  ↓
Parses device info from user agent
  ↓
Fetches IP location (ipapi.co/ipinfo.io)
  ↓
Creates log entry
  ↓
Pushes to Link.logs[]
  ↓
Saves to MongoDB
```

### Media Capture Flow:
```
Frontend uploads file → POST /api/capture/:pageId
  ↓
Multer receives file
  ↓
Upload to Cloudinary
  ↓
Get Cloudinary URL
  ↓
Save URL to logs[latest].captures.image/audio
  ↓
Save to MongoDB
```

### Permissions Flow:
```
Frontend sends permissions → POST /api/permissions/:pageId
  ↓
Find latest log entry (or by logId)
  ↓
Merge permissions into logs[].permissions
  ↓
Save to MongoDB
```

## Environment Variables

Required:
- `MONGO_URI` - MongoDB connection string
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

## Testing

```bash
# Start server
cd backend
npm start

# Test visit tracking
curl http://localhost:5000/page/your-page-id

# Test media capture
curl -X POST http://localhost:5000/api/capture/your-page-id \
  -F "file=@image.jpg"

# Test permissions
curl -X POST http://localhost:5000/api/permissions/your-page-id \
  -H "Content-Type: application/json" \
  -d '{"permissions":{"location":"granted","cameraview":"denied"}}'
```

## Notes

- All log entries are **append-only** - never modified or deleted
- IP location fetching is **non-blocking** - if it fails, visit is still tracked
- Media uploads are **optional** - visit tracking works without media
- Permission logging is **optional** - visit tracking works without permissions
- The backend is **stateless** - no sessions or authentication required
