import { setupWebSocket } from './websocket.js';
import { createUIHandlers, updateTransportButtonState, updatePlaybackState, updateTimelineData } from './uiProducerHandlers.js';
import { fetchPlaylistData, findClipByClipName, setSelectedClip as coreSetSelectedClip, loadClipByCleanName } from './playlist.js';
import { updatePlaylistDOM, setSelectedClip as uiSetSelectedClip } from './playlistDOM.js';

const uiHandlers = createUIHandlers({
    //updatePlaylistDOM, // Uncommented this line
    updatePlaylistDOM, // Uncommented this line
    updateTransportButtonState,
    updatePlaybackState,
    updateTimelineData
    updateTimelineData,
    fetchPlaylistData,
    findClipByClipName,
    setSelectedClip: uiSetSelectedClip
});

setupWebSocket(uiHandlers); // Pass uiHandlers to setupWebSocket