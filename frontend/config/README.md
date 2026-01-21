# API Configuration

## External Backend Setup

This frontend connects to your external backend server that manages links in the database.

### Configuration

1. **Update API URL**: Edit `frontend/config/api.ts` and set your external backend URL:

```typescript
export const API_BASE_URL = 'https://your-external-backend-url.com';
```

### API Endpoints Used

The frontend makes the following API calls to your external backend:

1. **Check if Link Exists**
   - `GET /api/links/:id`
   - Checks if a link with the given pageId exists
   - Returns 404 if not found, 200 with link data if found

2. **Save Log Data**
   - `POST /api/links/:id/logs`
   - Sends all collected device/network/permission data
   - Data format matches the Link model schema

### Data Flow

1. User enters ID (pageId) in the app
2. Frontend checks if ID exists: `GET /api/links/:id`
3. If exists, frontend collects:
   - Device information (OS, model, vendor, type)
   - Network information (IP, network type)
   - Location (if permission granted)
   - Permission statuses
   - Request metadata
4. Frontend sends all data: `POST /api/links/:id/logs`
5. External backend saves data to database
6. External backend can fetch and display data on its frontend

### Required Backend Endpoints

Your external backend should have these endpoints:

- `GET /api/links/:id` - Get link by pageId
- `POST /api/links/:id/logs` - Save log data to link

If your backend uses different endpoints, update the fetch calls in `frontend/app/index.tsx`.
