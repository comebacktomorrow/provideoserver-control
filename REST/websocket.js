const WebSocket = require('ws');

function initializeWebSocket(server, controller) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('Client connected');

        let previousState = null;
        let previousTimecode = null;
        let previousClipName = null;
        let previousLibraryTimestamp = null;
        let forceUpdate = false;
        let previousTally = -1;

        const forceUpdateInterval = setInterval(() => {
            forceUpdate = true;
        }, 10000); // Set the force update flag every 10 seconds

        const updateInterval = setInterval(sendUpdates, 50); // Check for updates every second

        // Send initial state, timecode, and clip name
        ws.send(JSON.stringify({
            state: controller.getTransportState(),
            timecode: controller.getCurrentTransportTime(),
            clipName: controller.getLoadedNameClip(),
            libraryTimestamp: controller.getLibraryTimestamp(),
            tallyState: controller.getTallyState()
        }));

        ws.on('message', (message) => {
            console.log(`Received message: ${message}`);
        });

        ws.on('close', () => {
            console.log('Client disconnected');
            clearInterval(updateInterval);  // Clear the interval on disconnect
            clearInterval(forceUpdateInterval);  // Clear the force update interval on disconnect
        });

        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
        });

        // Function to send updates
        function sendUpdates() {
            if (ws.readyState === WebSocket.OPEN) {
                const state = controller.getTransportState();
                const timecode = controller.getCurrentTransportTime();
                const clipName = controller.getLoadedNameClip();
                const libraryTimestamp = controller.getLibraryTimestamp();
                const tallyState =controller.getTallyState()

                // Check if any data has changed
                const hasChanged = (
                    state !== previousState ||
                    JSON.stringify(timecode) !== JSON.stringify(previousTimecode) ||
                    clipName !== previousClipName ||
                    libraryTimestamp !== previousLibraryTimestamp ||
                    tallyState != previousTally
                );

                if (hasChanged || forceUpdate) {
                    const message = {
                        state,
                        timecode,
                        clipName,
                        libraryTimestamp,
                        tallyState
                    };

                    // Log the message to be sent
                    //console.log('Sending WebSocket message:', message);

                    try {
                        ws.send(JSON.stringify(message));

                        // Update previous values
                        previousState = state;
                        previousTimecode = timecode;
                        previousClipName = clipName;
                        previousLibraryTimestamp = libraryTimestamp;
                        previousTally = tallyState;

                        // Reset force update flag
                        forceUpdate = false;
                    } catch (error) {
                        console.error('WebSocket send error:', error);
                    }
                }
            } else {
                console.log('WebSocket is not open. Ready state:', ws.readyState);
            }
        }

        // Call sendUpdates whenever state, timecode, or clip name changes
        // Assuming you have a way to trigger this function on changes
    });

    console.log('WebSocket server is running');
}

module.exports = initializeWebSocket;