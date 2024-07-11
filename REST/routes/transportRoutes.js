const express = require('express');
const router = express.Router();
const transportController = require('../controllers/transportController');

router.post('/play', transportController.play);
router.post('/pause', transportController.pause);
router.post('/stop', transportController.stop);
router.post('/toggle', transportController.toggle);
router.post('/jump/:time', transportController.jumpTime);
router.post('/end/:time', transportController.jumpBack);
router.get('/state', transportController.getTransportState);

module.exports = router;