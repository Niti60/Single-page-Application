# Backend Server

Express.js backend server with MongoDB connection.

## Setup

1. Install dependencies:
```bash
cd backend
npm install
```

2. Make sure `.env` file exists in the root directory with:
```
PORT=5000
MONGO_URI=your_mongodb_connection_string
```

3. Start the server:
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## API Endpoints

- `GET /` - Server status
- `GET /health` - Health check with database status
- `GET /api/test` - Test API endpoint

## Database

The server connects to MongoDB using the connection string from `.env` file.
