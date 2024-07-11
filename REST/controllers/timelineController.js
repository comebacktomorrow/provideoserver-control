exports.getLoadedClip = (req, res) => {
    const controller = req.app.get('controller');
    controller.getClipSelected((err, clip) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(clip);
    });
};


exports.loadClipByIndex = (req, res) => {
    const controller = req.app.get('controller');
    const { id } = req.params;
    controller.loadClipByIndex(id);
    res.status(200).send('Clip loaded by index');
};

exports.loadClipByName = (req, res) => {
    const controller = req.app.get('controller');
    const { name } = req.params;
    controller.loadClipByName(name);
    res.status(200).send('Clip loaded by name');
};

exports.loadClipByCleanName = (req, res) => {
    const controller = req.app.get('controller');
    const { cleanName } = req.params;
    controller.loadClipByCleanName(cleanName);
    res.status(200).send('Clip loaded by clean name');
};

exports.queueNext = (req, res) => {
    const controller = req.app.get('controller');
    controller.queueNext();
    res.status(200).send('Next clip queued');
};

exports.queuePrevious = (req, res) => {
    const controller = req.app.get('controller');
    controller.queuePrevious();
    res.status(200).send('Previous clip queued');
};

exports.requeue = (req, res) => {
    const controller = req.app.get('controller');
    controller.requeueClip();
    res.status(200).send('Clip requeued');
};