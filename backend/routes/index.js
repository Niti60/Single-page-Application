const express = require('express');
const linksRoutes = require('./links');

const router = express.Router();

// Test route
router.get('/api/test', (req, res) => {
  res.json({ message: 'API is working' });
});

// Link routes - mount all /api/links routes
router.use('/api/links', linksRoutes);

module.exports = router;
