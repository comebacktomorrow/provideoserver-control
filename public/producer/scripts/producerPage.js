import { setupWebSocket } from './websocket.js';
import { createUIHandlers, updateTransportButtonState, updatePlaybackState, updateTimelineData } from './uiProducerHandlers.js';

const uiHandlers = createUIHandlers({
    //updatePlaylistDOM, // Uncommented this line
    updateTransportButtonState,
    updatePlaybackState,
    updateTimelineData
});

setupWebSocket(uiHandlers); // Pass uiHandlers to setupWebSocket