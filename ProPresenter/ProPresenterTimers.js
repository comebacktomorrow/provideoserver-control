const express = require('express');
const http = require('http');

const app = express();
const port = 3000;

const PRO_PRES_IP = 'localhost';
const PRO_PRES_PORT = 50050;

const TIMER_URL = `http://${PRO_PRES_IP}:${PRO_PRES_PORT}/v1/timers?chunked=false`;
const TIMER_UPDATE_URL = `http://${PRO_PRES_IP}:${PRO_PRES_PORT}/v1/timer/`;

// Middleware to parse JSON requests
app.use(express.json());

function fetchTimers() {
    return new Promise((resolve, reject) => {
        http.get(TIMER_URL, (resp) => {
            let data = '';

            // A chunk of data has been received.
            resp.on('data', (chunk) => {
                data += chunk;
            });

            // The whole response has been received. Print out the result.
            resp.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (error) {
                    reject(error);
                }
            });

        }).on("error", (err) => {
            reject(err);
        });
    });
}

function updateTimer(timer) {
    const { name } = timer.id;
    const encodedName = encodeURIComponent(name);
    const data = JSON.stringify(timer);
    
    const options = {
        hostname: PRO_PRES_IP,
        port: PRO_PRES_PORT,
        path: `/v1/timer/${encodedName}`,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length,
        },
    };

    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let response = '';

            res.on('data', (chunk) => {
                response += chunk;
            });

            res.on('end', () => {
                resolve(response);
            });
        });

        req.on('error', (e) => {
            reject(e);
        });

        req.write(data);
        req.end();
    });
}

async function updateAllTimers() {
    try {
        const timers = await fetchTimers();
        const currentTime = Math.floor(Date.now() / 1000);

        timers.forEach(timer => {
            if (timer.countdown) {
                // Adjust the timer's countdown duration based on your logic
                //const newDuration = timer.countdown.duration - (currentTime % timer.countdown.duration);
                const newDuration = 60;

                const updatedTimer = {
                    ...timer,
                    countdown: {
                        duration: newDuration,
                    },
                };

                updateTimer(updatedTimer)
                    .then(() => console.log(`Successfully updated timer: ${timer.id.name} ${JSON.stringify(updatedTimer)}`))
                    .catch((error) => console.error(`Error updating timer ${timer.id.name}:`, error));
            }
        });
    } catch (error) {
        console.error('Error updating all timers:', error);
    }
}

// Set interval to update all timers every minute (60000 ms)
setInterval(updateAllTimers, 5000);

// Define routes if needed
app.get('/', (req, res) => {
    res.send('Timer update service is running.');
});

app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    // Initial timer update
    updateAllTimers();
});