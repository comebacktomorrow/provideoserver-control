//util.js
export const pad = number => number.toString().padStart(2, '0');

export const jsonTimecodeToString = timecode => {
    const hours = pad(timecode.hours);
    const minutes = pad(timecode.minutes);
    const seconds = pad(timecode.seconds);
    const frames = pad(timecode.frames);
    return `${hours}:${minutes}:${seconds}:${frames}`;
};

export const timecodeToTotalFrames = (timecode, fps) => {
    const frames =  (timecode.hours * 3600 + timecode.minutes * 60 + timecode.seconds) * fps + timecode.frames;
    return frames;

}

export const timecodeToPercentage = (timecode, duration, fps) => {
    const totalFrames = timecodeToTotalFrames(timecode, fps);
    const totalDurationFrames = timecodeToTotalFrames(duration, fps);
    return (totalFrames / totalDurationFrames) * 100;
};

// I don't know if I need this. Probs not any more
function updateResponse(responseText) {
    //const responseDiv = document.getElementById('response');
    //responseDiv.innerText = responseText;
}

export const fetchAndUpdateResponse = (url, method, body = null) => {
    return fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : null
    })
    .then(response => response.json())
    .then(data => updateResponse(JSON.stringify(data)))
    .catch(error => updateResponse('Error: ' + error));
};

export const calcTimeRemainingAsString = (time1, time2, fps, allowNegative = true) => {
    const frameRate = Math.round(fps * 100)/100;
    //console.log("framte rate is " + frameRate)
    const t1 = new Timecode(jsonTimecodeToString(time1),  frameRate);
    const t2 = new Timecode(jsonTimecodeToString(time2),  frameRate);


    let result = null
    let sign = '-'
    if(t1 < t2){
        //not overrun - not negative
        result = t2.subtract(t1);
        sign = ''
    } else {
        if (allowNegative){
            //is overrun - is negative
        result = t1.subtract(t2);
        sign = '-'
        } else {
            result ='00:00:00:00';
        }
        
    }

    return {result: result, sign: sign}; 
}