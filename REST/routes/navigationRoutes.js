const express = require('express');
const router = express.Router();
const timelineController = require('../controllers/timelineController');

router.post('/next', timelineController.queueNext);
router.post('/previous', timelineController.queuePrevious);
router.post('/recue', timelineController.requeue);

module.exports = router;