//const logger = require('./logger');
const { secondsToTimecode } = require("../../utilities");

exports.play = (req, res) => {
  const controller = req.app.get("controller");
  controller.play();
  const response = {
    message: "Play",
  };
  res.status(200).json(response);
};

exports.pause = (req, res) => {
  const controller = req.app.get("controller");
  controller.pause();
  const response = {
    message: "Paused",
  };
  res.status(200).json(response);
};

exports.stop = (req, res) => {
  const controller = req.app.get("controller");
  controller.stop();
  const response = {
    message: "Stop",
  };
  res.status(200).json(response);
};

exports.toggle = (req, res) => {
  const controller = req.app.get("controller");
  controller.togglePlayback();
  const response = {
    message: "Toggle",
  };
  res.status(200).json(response);
};

exports.jumpTime = (req, res) => {
  const controller = req.app.get("controller");
  const { time } = req.params;
  let op = "add";
  if (time < 0) {
    op = "subtract";
  }
  let t = secondsToTimecode(time);
  controller.jumpTime({ timecode: t, operation: op });
  const response = {
    message: `Jumped to ${time}`,
  };
  res.status(200).send(response);
};

exports.jumpBack = (req, res) => {
  const controller = req.app.get("controller");
  const { time } = req.params;
  controller.jumpBack({ timecode: secondsToTimecode(time) });
  res.status(200).send(`Jumped back ${time}`);
};

exports.jumpBack = (req, res) => {
  const controller = req.app.get("controller");
  const { time } = req.params;
  let t = secondsToTimecode(time);
  controller.jumpBack({ timecode: t });
  const response = {
    message: time,
  };
  res.status(200).send(response);
};

//// we're here

exports.getTransportState = (req, res) => {
  const controller = req.app.get("controller");
  res.json(controller.getTransportState());
};

exports.getTransportTimes = (req, res) => {
  const controller = req.app.get("controller");
  res.json(controller.getCurrentTransportTime());
};

exports.cueUpData = async (req, res) => {
    const controller = req.app.get('controller');
    const { timecode } = req.body;

    try {
        if (timecode && !timecode.percentage) {
            console.log('Setting playhead to timecode:', timecode);
            await controller.jumpToTimecode(timecode); // Using await for async operation
            res.status(200).send('Playhead set to timecode.');
        } else if (timecode && timecode.percentage !== undefined) {
            console.log('Setting playhead to percentage:', timecode.percentage);

            // Get selected clip asynchronously
            const clip = await new Promise((resolve, reject) => {
                controller.getClipSelected((err, clip) => {
                    if (err) {
                        reject(err);
                    } else if (!clip) {
                        reject(new Error('No clip selected'));
                    } else {
                        resolve(clip);
                    }
                });
            });

            const duration = clip.duration;
            const totalFrames =
                (duration.hours * 3600 + duration.minutes * 60 + duration.seconds) * clip.fps +
                duration.frames;
            const targetFrame = Math.round(totalFrames * timecode.percentage);
            const calculatedTimecode = {
                hours: Math.floor(targetFrame / (3600 * clip.fps)),
                minutes: Math.floor((targetFrame % (3600 * clip.fps)) / (60 * clip.fps)),
                seconds: Math.floor((targetFrame % (60 * clip.fps)) / clip.fps),
                frames: Math.floor(targetFrame % clip.fps),
            };

            console.log('Calculated timecode from percentage:', calculatedTimecode);

            // Jump to calculated timecode asynchronously
            await controller.jumpToTimecode(calculatedTimecode);
            res.status(200).json({ timecode: calculatedTimecode });
        } else {
            res.status(400).send('Invalid request: must provide either timecode or percentage.');
        }
    } catch (error) {
        res.status(500).send('Error processing request: ' + error.message);
    }
};

// I kind of want to make this one function - get time

exports.getPlayheadTime = (req, res) => {
  const controller = req.app.get("controller");
  res.json(controller.getCurrentTransportTime());
};

exports.getDuration = (req, res) => {
  const controller = req.app.get("controller");
  res.json(controller.getDuration());
};

exports.getT1 = (req, res) => {
  const controller = req.app.get("controller");
  res.json(controller.getT1());
};

exports.getT2 = (req, res) => {
  const controller = req.app.get("controller");
  res.json(controller.getT2());
};

exports.getTRT = (req, res) => {
  const controller = req.app.get("controller");
  res.json(controller.getTRT());
};
