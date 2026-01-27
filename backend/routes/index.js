// NOTE: This file is deprecated - trackingRoutes.js is now used directly in server.js
// Keeping this file for backward compatibility but it's not mounted in server.js

const express = require('express');
const router = express.Router();

// This router is no longer used - trackingRoutes.js is mounted directly
router.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

module.exports = router;
