const express = require('express');
const router = express.Router();
const playlistController = require('../controllers/playlistController');

router.get('/', playlistController.getAllClips);
router.get('/id/:id', playlistController.getClipByIndex);
router.get('/name/:name', playlistController.getClipByName);
router.get('/clean-name/:cleanName', playlistController.getClipByCleanName);

// times - yet to be done
router.post('/id/:id/times', playlistController.updateClipTimersById);
router.post('/name/:name/times', playlistController.updateClipTimersByName);
router.post('/clean-name/:cleanName/times', playlistController.updateClipTimersByCleanName);

module.exports = router;