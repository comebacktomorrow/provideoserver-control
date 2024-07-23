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
    try {
        controller.loadClipByIndex(id);
        res.status(200).json({ message: 'Clip loaded by index', clipId: id });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load clip by index', error: error.message });
    }
};

exports.loadClipByName = (req, res) => {
    const controller = req.app.get('controller');
    const { name } = req.params;
    try {
        controller.loadClipByName(name);
        res.status(200).json({ message: 'Clip loaded by name', clipName: name });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load clip by name', error: error.message });
    }
};

exports.loadClipByCleanName = (req, res) => {
    const controller = req.app.get('controller');
    const { cleanName } = req.params;

    try {
        controller.loadClipByCleanName(cleanName);
        res.status(200).json({ message: 'Clip loaded by clean name', cleanName: cleanName });
    } catch (error) {
        res.status(500).json({ message: 'Failed to load clip by clean name', error: error.message });
    }
};

exports.queueNext = (req, res) => {
    const controller = req.app.get('controller');

    try {
        controller.queueNext();
        res.status(200).json({ message: 'Next clip queued' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to queue next clip', error: error.message });
    }
};

exports.queuePrevious = (req, res) => {
    const controller = req.app.get('controller');

    try {
        controller.queuePrevious();
        res.status(200).json({ message: 'Previous clip queued' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to queue previous clip', error: error.message });
    }
};

exports.requeue = (req, res) => {
    const controller = req.app.get('controller');

    try {
        controller.requeueClip();
        res.status(200).json({ message: 'Clip requeued' });
    } catch (error) {
        res.status(500).json({ message: 'Failed to requeue clip', error: error.message });
    }
};