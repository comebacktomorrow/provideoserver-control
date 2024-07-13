const WebSocket = require('ws');

function initializeWebSocket(server, controller) {
    const wss = new WebSocket.Server({ server });

    wss.on('connection', (ws) => {
        console.log('Client connected');

        setInterval(sendUpdates, 1000);

        // Send initial state, timecode, and clip name
        ws.send(JSON.stringify({
            state: controller.getTransportState(),
            timecode: controller.getCurrentTransportTime(),
            clipName:  controller.getLoadedNameClip()
        }));

        ws.on('message', (message) => {
            console.log(`Received message: ${message}`);
        });

        ws.on('close', () => {
            console.log('Client disconnected');
        });

        // Function to send updates
        function sendUpdates() {
            if (ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({
                    state: controller.getTransportState(),
                    timecode: controller.getCurrentTransportTime(),
                    clipName: controller.getLoadedNameClip()
                }));
            }
        }

        // Call sendUpdates whenever state, timecode, or clip name changes
        // Assuming you have a way to trigger this function on changes
    });

    console.log('WebSocket server is running');
}

module.exports = initializeWebSocket;