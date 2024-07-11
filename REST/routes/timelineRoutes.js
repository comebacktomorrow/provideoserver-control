const express = require('express');
const router = express.Router();
const timelineController = require('../controllers/timelineController');

router.get('/active/clip', timelineController.getLoadedClip);
router.post('/active/id/:id', timelineController.loadClipByIndex);
router.post('/active/name/:name', timelineController.loadClipByName);
router.post('/active/clean-name/:cleanName', timelineController.loadClipByCleanName);

module.exports = router;