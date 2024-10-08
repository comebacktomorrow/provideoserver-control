//index.js
const readline = require('readline');

const startInteractiveConsole = (controller) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

controller.CRAT({ channel: "Vtr1"});

async function handleCommand(command) {
    switch (command.trim()) {
        case 'p':
            controller.play(); // Example: play with default time
            break;
        case 'h':
            controller.pause(); // Example: play with default time
            break;
        case 'f':
            controller.togglePlayback(); // Example: play with default time
            break;
        case 'k':
            controller.CRAT({ channel: "Vtr1"}); // Example: play with default time
            break;
        case 's':
            controller.stop();
            break;
        case 'q':
            controller.cueUpData({ timecode: { frames: 21, seconds: 6, minutes: 1, hours: 0 } });
            break;
        case 't':
            controller.currentTimeSense();
            break;
        case 'l':
            controller.inPreset({ clipname: 'C5000'});
            break;
        case '?':
            controller.IDLoadedRequest();
            break;
        case 'a':
            controller.getAllClips((err, clips) => {
                if (err) {
                    console.error('err',err);
                } else {
                    console.log('ok ',clips);
                }
            });
            break;
        case 'n':
            controller.loadClipByName('A2400', (err, clip) => {
                if (err) {
                    console.error("error", err);
                } else {
                    console.log("ok", clip);
                }
            });
            break;
        case 'c':
            controller.loadClipByCleanName('C5000 copy', (err, clip) => {
                if (err) {
                    console.error("error", err);
                } else {
                    console.log("ok", clip);
                }
            });
            break;
        case 'i':
            controller.getClipByIndex(0, (err, clip) => {
                if (err) {
                    console.error("error", err);
                } else {
                    console.log("ok", clip);
                }
            });
        break;
        case 'o':
            controller.getClipSelected((err, clips) => {
                if (err) {
                    console.error("err", err);
                } else {
                    console.log("ok", clips);
                }
            });
            break;
        case '0':
            controller.setClipTimer('A2400', 't1',{ timecode: { frames: 21, seconds: 6, minutes: 1, hours: 0 } }, (err, clip) => {
                if (err) {
                    console.error("error", err);
                } else {
                    console.log("ok", clip);
                }
            });
        case '1':
            controller.loadClipByIndex(0);
        break;
        case '2':
            controller.loadClipByIndex(1);
        break;
        case '3':
            controller.loadClipByIndex(2);
        break;
        case '4':
            controller.loadClipByIndex(3);
        break;
        case 'u':
            await controller.getLoadedClipPlaylistData( (err, clip) => {
                if (err) {
                    console.error("error", err);
                } else {
                    console.log("INDEX ok", clip);
                }
            });
        break;
        case '>':
            controller.queueNext();
        break;
        case '<':
            controller.queuePrevious();
        break;
        case ']':
            controller.jumpTime({timecode: { frames: 0, seconds: 15, minutes: 0, hours: 0 }, operation: 'add'});
        break;
        case '[':
            controller.jumpTime({timecode: { frames: 0, seconds: 15, minutes: 0, hours: 0 }, operation: 'subtract'});
        break;
        case 'b':
            controller.jumpBack({timecode: { frames: 0, seconds: 15, minutes: 0, hours: 0 }, operation: 'subtract'});
        break;
        case 'r':
            controller.requeueClip();
        break;
        // case 'l':
        //     controller.listFirstRequest();
        //     break;
        // case 'k':
        //     controller.listNextRequest();
        //     break;
        case 'x':
            rl.close();
            process.exit(0);
        default:
            console.log('Unknown command. Available commands: p (play), s (stop), c (cueClip), t (timeSense), u (statusSense), q (quit), f (fast forward), r (rewind)');
    }
}

console.log('Enter commands: p (play), s (stop), c (cueClip), t (timeSense), u (statusSense), q (quit), f (fast forward), r (rewind)');
rl.on('line', (input) => {
    handleCommand(input);
});

};

module.exports = startInteractiveConsole;

// case 'y':
        //     controller.getDeviceType(); // Example: play with default time
        // case 'n':
        //     controller.CRAT({ channel: "Vtr1"}); // Example: play with default time
        //     break;
        // case 'b':
        //     controller.getDeviceID(); // Example: play with default time
        // case 'f':
        //     controller.forward({mode: 'fast'})
        // case 'r':
        //     controller.rewind({mode: 'rewind'})
        // case 'd':
        //     controller.IDDurationRequest(); // Example: play with default time
        //     break;
        // case 'k':
        //     controller.countRequest();
        //     break;
        // case 'l':
        //     controller.listFirstRequest();
        //     break;
        // case 'o':
        //     controller.listNextRequest();
        //     break;
        // case 'm':
        //     controller.setLoopMode();
        //     break;
        // case 'n':
        //     controller.getDeviceName(); // Example: play with default time
        //     break;
        // case 'c':
        //     controller.cueClip({ channel: "1", clipName: "clip1" });
        //     break;