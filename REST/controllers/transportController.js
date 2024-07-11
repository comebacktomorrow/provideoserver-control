//const logger = require('./logger');
const { secondsToTimecode } = require('../../utilities');

exports.play = (req, res) => {
    const controller = req.app.get('controller');
    controller.play();
    res.status(200).send('Playing');
};

exports.pause = (req, res) => {
    const controller = req.app.get('controller');
    controller.pause();
    res.status(200).send('Paused');
};

exports.stop = (req, res) => {
    const controller = req.app.get('controller');
    controller.stop();
    res.status(200).send('Stopped');
};

exports.toggle = (req, res) => {
    const controller = req.app.get('controller');
    controller.togglePlayback();
    res.status(200).send('Toggled');
};

exports.jumpTime = (req, res) => {
    const controller = req.app.get('controller');
    const { time } = req.params;
    let op = 'add'
        if (time < 0) {
            op = 'subtract'
        }
    let t = secondsToTimecode(time)
    controller.jumpTime({timecode: t, operation: op});
    res.status(200).send(`Jumped to ${time}`);
};

exports.jumpBack = (req, res) => {
    const controller = req.app.get('controller');
    const { time } = req.params;
    controller.jumpBack({timecode: secondsToTimecode(time)});
    res.status(200).send(`Jumped back ${time}`);
};

//// we're here

exports.getTransportState = (req, res) => {
    const controller = req.app.get('controller');
    res.json(controller.getTransportState());
};

exports.getTransportTimes = (req, res) => {
    const controller = req.app.get('controller');
    res.json(controller.getCurrentTransportTime());
};

exports.cueUpData = (req, res) => {
    const controller = req.app.get('controller');
    const { timecode } = req.body;
    console.log('trying ' + timecode)
    controller.jumpToTimecode(timecode);
    res.status(200).send('Playhead cued: ');
};


// I kind of want to make this one function - get time

exports.getPlayheadTime = (req, res) => {
    const controller = req.app.get('controller');
    res.json(controller.getCurrentTransportTime());
};

exports.getDuration = (req, res) => {
    const controller = req.app.get('controller');
    res.json(controller.getDuration());
};

exports.getT1 = (req, res) => {
    const controller = req.app.get('controller');
    res.json(controller.getT1());
};

exports.getT2 = (req, res) => {
    const controller = req.app.get('controller');
    res.json(controller.getT2());
};

exports.getTRT = (req, res) => {
    const controller = req.app.get('controller');
    res.json(controller.getTRT());
};