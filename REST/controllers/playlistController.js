const logger = require('../../logger');

exports.getAllClips = (req, res) => {
    const controller = req.app.get('controller');
    controller.getAllClips((err, clips) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(clips);
    });
};
exports.getClipByIndex = (req, res) => {
    const controller = req.app.get('controller');
    const { id } = req.params;
    controller.getClipByIndex(id, (err, clip) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(clip);
    });
};


exports.getClipByName = (req, res) => {
    const controller = req.app.get('controller');
    const { name } = req.params;
    controller.getClipByName(name, (err, clip) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(clip);
    });
};

exports.getClipByCleanName = (req, res) => {
    const controller = req.app.get('controller');
    const { cleanName } = req.params;
    logger.debug('getting clip by clean-name: ' + cleanName)
    controller.getClipByCleanName(cleanName, (err, clip) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(clip);
    });
};


/// TO DO //// FROM HERE DOWN
exports.updateClipTimersById = (req, res) => {
    const controller = req.app.get('controller');
    const { id } = req.params;
    
    const { timer, timecode } = req.body;
    controller.setClipTimerByClipIndex(id, timer, timecode, (err, clip) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(clip);
    })
};

exports.updateClipTimersByName = (req, res) => {
    const controller = req.app.get('controller');
    const { name } = req.params;
    const { timerName, timecode } = req.body;
    controller.updateClipTimersByClipName(name, timerName, timecode);
    res.status(200).send('Clip timer updated');
};

exports.updateClipTimersByCleanName = (req, res) => {
    const controller = req.app.get('controller');
    const { cleanName } = req.params;
    const { timerName, timecode } = req.body;
    controller.updateClipTimerByCleanName(cleanName, timerName, timecode);
    res.status(200).send('Clip timer updated');
};