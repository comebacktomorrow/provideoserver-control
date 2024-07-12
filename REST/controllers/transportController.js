//const logger = require('./logger');
const { secondsToTimecode } = require('../../utilities');

exports.play = (req, res) => {
    const controller = req.app.get('controller');
    controller.play();
    const response = {
        message: 'Play'
    };
    res.status(200).json(response);
};

exports.pause = (req, res) => {
    const controller = req.app.get('controller');
    controller.pause();
    const response = {
        message: 'Paused'
    };
    res.status(200).json(response);
};

exports.stop = (req, res) => {
    const controller = req.app.get('controller');
    controller.stop();
    const response = {
        message: 'Stop'
    };
    res.status(200).json(response);
};

exports.toggle = (req, res) => {
    const controller = req.app.get('controller');
    controller.togglePlayback();
    const response = {
        message: 'Toggle'
    };
    res.status(200).json(response);
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
    const response = {
        message: `Jumped to ${time}`
    };
    res.status(200).send(response);
};

exports.jumpBack = (req, res) => {
    const controller = req.app.get('controller');
    const { time } = req.params;
    controller.jumpBack({timecode: secondsToTimecode(time)});
    res.status(200).send(`Jumped back ${time}`);
};

exports.jumpBack = (req, res) => {
    const controller = req.app.get('controller');
    const { time } = req.params;
    let t = secondsToTimecode(time)
    controller.jumpBack({timecode: t});
    const response = {
        message: time
    };
    res.status(200).send(response);
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