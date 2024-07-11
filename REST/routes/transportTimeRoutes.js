const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');

router.get('/', transportController.getTransportTimes);
router.post('/playhead', transportController.cueUpData);
router.get('/playhead', transportController.getPlayheadTime);
router.get('/duration', transportController.getDuration);
router.get('/t1', transportController.getT1);
router.get('/t2', transportController.getT2);
router.get('/trt', transportController.getTRT);

module.exports = router;