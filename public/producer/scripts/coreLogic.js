let currentLibraryTimeStamp;
let previousClip = {};
let currentTimecode;

export const updateStatus = (socketData, updateHandlers) => {
    const {
        onLibraryUpdate,
        onStateChange,
        onClipChange,
        onTimecodeUpdate,
        onTallyUpdate,
    } = updateHandlers;

    if (currentLibraryTimeStamp !== socketData.libraryTimestamp) {
        currentLibraryTimeStamp = socketData.libraryTimestamp;
        onLibraryUpdate(socketData);
    }

    if (socketData.state !== previousClip.state) {
        onStateChange(socketData);
    }

    if (socketData.clipName !== previousClip.clipName) {
        onClipChange(socketData);
    }

    if (currentTimecode !== socketData.timecode) {
        currentTimecode = socketData.timecode;
        onTimecodeUpdate(socketData);
    }

    onTallyUpdate(socketData.tallyState);
    previousClip = socketData;
};