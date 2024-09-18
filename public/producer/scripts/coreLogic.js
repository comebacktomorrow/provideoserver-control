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

    // this will probably have the issue that we need to flatten the object 
    // otehrwise it will aways be seen as different
    if (currentTimecode !== socketData.timecode) {
        currentTimecode = socketData.timecode;
        onTimecodeUpdate(socketData);
    }

    // this will always be called :\
    onTallyUpdate(socketData.tallyState);
    previousClip = socketData;
};