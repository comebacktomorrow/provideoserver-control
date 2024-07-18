import { updateStatus } from './coreLogic.js';

export const setupWebSocket = (updateHandlers) => { // Accept updateHandlers as a parameter
    const socket = new WebSocket(window.location.protocol === 'https:' ? 'wss://' : 'ws://' + window.location.host);

    socket.addEventListener('open', () => console.log('WebSocket connection established.'));
    socket.addEventListener('message', event => updateStatus(JSON.parse(event.data), updateHandlers)); // Pass updateHandlers
    socket.addEventListener('close', () => {
        console.log('WebSocket connection closed. Attempting to reconnect...');
        setTimeout(() => setupWebSocket(updateHandlers), 1000); // Ensure updateHandlers is passed on reconnection
    });
    socket.addEventListener('error', error => console.error('WebSocket error:', error));
};