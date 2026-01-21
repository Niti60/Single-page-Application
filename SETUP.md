# Setup Guide - External Backend Integration

## Overview

This frontend app connects to your **external backend server** that manages links in the database. When a user enters an ID (pageId), the app collects all device/network/permission data and sends it to your external backend.

## Quick Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

This will install the required packages including:
- `expo-device`
- `expo-application`
- `expo-network`

### 2. Configure External Backend URL

Edit `frontend/config/api.ts` and update the API_BASE_URL:

```typescript
export const API_BASE_URL = 'https://your-external-backend-url.com';
```

**Example:**
```typescript
export const API_BASE_URL = 'https://api.example.com';
```

### 3. Required Backend Endpoints

Your external backend must have these endpoints:

#### Check if Link Exists
- **Endpoint:** `GET /api/links/:id`
- **Description:** Checks if a link with the given pageId exists
- **Response:** 
  - `200 OK` - Link found (returns link data)
  - `404 Not Found` - Link doesn't exist

#### Save Log Data
- **Endpoint:** `POST /api/links/:id/logs`
- **Description:** Saves collected device/network/permission data
- **Request Body:** JSON matching the Link model schema:
  ```json
  {
    "timestamp": "2024-01-20T12:00:00.000Z",
    "request": {
      "ip": "192.168.1.1",
      "rawIp": "192.168.1.1",
      "referrer": "",
      "userAgent": "Mobile App - iPhone"
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
      "image": "",
      "audio": ""
    }
  }
  ```
- **Response:**
  - `200 OK` - Log saved successfully
  - `404 Not Found` - Link doesn't exist
  - `500 Internal Server Error` - Server error

## How It Works

1. **User enters ID** - User types the pageId in the input field
2. **Check existence** - App calls `GET /api/links/:id` to verify the ID exists
3. **Collect data** - If ID exists, app collects:
   - Device information (OS, model, vendor, type)
   - Network information (IP, network type)
   - Location (if permission granted)
   - Permission statuses (contacts, notifications, media, location, camera, microphone)
   - Request metadata (IP, user agent, referrer)
4. **Send data** - App calls `POST /api/links/:id/logs` with all collected data
5. **Backend saves** - Your external backend saves the data to MongoDB
6. **Display data** - Your external backend can fetch and display this data on its frontend

## Testing

1. Make sure your external backend is running
2. Create a link in your external backend (this generates a pageId)
3. Run the frontend app:
   ```bash
   cd frontend
   npm run dev
   ```
4. Enter the pageId in the app
5. Grant permissions when prompted
6. Check your external backend database to verify the log was saved

## Troubleshooting

### "Cannot find module 'expo-device'"
- Run `npm install` in the `frontend` directory

### "ID not found in database"
- Verify the pageId exists in your external backend database
- Check that `GET /api/links/:id` endpoint is working correctly

### "Error connecting to server"
- Verify the API_BASE_URL in `frontend/config/api.ts` is correct
- Check that your external backend is running and accessible
- Verify CORS is enabled on your external backend

### Data not saving
- Check the backend endpoint `POST /api/links/:id/logs` exists
- Verify the request body format matches the Link model schema
- Check backend logs for errors
