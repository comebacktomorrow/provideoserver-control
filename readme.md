# ProVideoServer (PVS) Control Proxy

This is the functionality for PVS that I wished existed in the program that didn't. Well, most of it.

This companion application is designed to make the most under-appreciated Renewed Vision app, a little more appreciated by providing the following functionallity:

 - **Web control interface** that works on desktop, tablet and iPhone. *(Thanks for your service AMP control App..)*
 - **Bitfocus Companion module** that can pull names and items, plus more.
 - **REST interface** that is mostly functional
 - Requeue current clip, queue next clip, queue previous clip function
 - **Auto-queue** next clip on completion (along with next and previous)
 - **TSL 3.1 support** that integrates with the above feature (auto-queue only once not on PGM)
 - **Timers support** — specifically two general purpose timers plus a video time remaining timer (TRT)). This last timer won't currently cut the video short, it just has an intentionally different purpose. **By default TRT is set to the video clip length.**
	 - Timers that can be set via the web interface, companion, or via file name.
	 - **File name timers** are entered using /[t1=hhmmssff] /[t2=hhmmssff] /[trt=hhmmssff] or via a [t1=-ss] format (negative being count back from end of clip).
	 - **Production control overview** web interface with an overview of the current clip, playback state and timer state
	 - **Stage display web output** with current time of day and soonest expiring clock. Video time is only shown while the video is playing and is on air. Video will not display video clip time, only TRT. If TRT has been set and has been expired, 00:00 will remain on screen until the video stops playing or is taken off air. If you don't have TSL data, you can set the url stage.html?tally=1 to force it to assume it is on air. You can also use hidetime=1 to hide the time of day clock (or tally=1&hidetime=1 for both).
	 - **ProPresenter timer integration**.
		 - ProPresenter timer support looks for "PVS Time Remaining", "PVS Timer 1", PVS Timer 2", and "PVS TRT". It makes no assumptions about priority and order, it leaves that up to you to implement in the stage display output. *Please note, it doesn't free run the timers (ie. play and pause), it updates the timers every second - 'not set' is effectively 0.*

# Getting running...

To get the application running, download the latest binary and run it on the same machines as PVS.
This app accesses the PVS Playlist XML file to get its metadata, which provides access to things like frame rate, codec and resolution. 

- The web interface can be accessed from http://localhost:port/
- The Production control screen can be accessed from localhost:port/producer/producer.html
- The Stage Display output can be accessed from localhost:port/producer/stage.html

## Requirements

 1. This app **does not support In and Out points**. These are not updated
    in real time via XML file (only on PVS close) and are not exposed via AMP, so there is no way to track them.
   2. **AMP Connection:** PVS Control also requires an AMP connection — PVS supports the most functionallity when in Multi Channel mode.
   3. **PVSControl.json file**: On startup, the app will look for a PVSControl.json file either in the same directory as the application, or in the users home directory (same directory as the ProVideoServer.pvs3 file)
    

### PVSControl.json file format

The PVSControl.json file has the following format.
Control is the web interface port, PVS is the AMP protocol port, Pro_Presenter is the network enabled port, TSL_RX is the port and address it will listen for TSL data on.

       { 
       "CONTROL": {
        "PORT": 5050
      },
      "PVS": {
        "IP_ADDRESS": "127.0.0.1",
        "PORT": 3811,
        "CHANNEL_NUMBER": 1,
        "CHANNEL_NAME": "Vtr1"
      },
      "PRO_PRESENTER": {
        "IP_ADDRESS": "localhost",
        "PORT": 50050
      },
      "TSL_RX": {
        "PORT": 40041,
        "ADDRESS": 2
      }
    }

## Known Issues

- Currently there is a know issue with 23.98 fps media and processing the frame output PVS generates - I've been able to catch most issues, but not all of them. There are probably a few more of these quirk time issues along side this one.
- Also untested are video of various durations - PVS has quirks with how it represents timecode over AMP, but it's mostly possible to untagle this. (Note, a rewrite of where we handle this would help - we currently try and deal with the frame data at the raw data level by inferring values based on possible frame rates; this is before the application is aware of the frame rate in the XML file)
- There might be occasional flickers with the play\pause detection state. The state is derived from the frame value reading - lower frame rates increase the chance of false pause detection. We filter for by comparing the two previous values and by attaching a timer to the pause state. It's a very short timer, but hopefully enough to deal with the fringe cases.
- As mentioned earlier, we do not handle In and Out points set in PVS due to the data not being available in any timely manner.
- Stage display output is relatively pre-baked. If you wish to override it, it might be worth looking into local css-overrides.
- Finally, I do not consider myself a programmer. There's bound to be a lot of scope for codebase improvement and a million potential bugs. This has been a passion project, so regretfully I cannot promise any support.


## Future Possibilities

It should be possible to extend the app to work with multiple PVS channels to work in either a main + backup format, a main + backup\alt playback format (using tags), or and A\B mode.
Also possible is the retrieval of clip thumbnails via Quicklook and displaying those on the various interfaces.
Finally, it should also be possible to transmit TLS data to Ross video switchers to expose clip or timer information to the multi view.

## Development & Building
With NodeJS installed, you can run this program from the command line using node index.js from the project root directory. 
The binary can be created by first running npm install -g pkg, and then npm run build.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Credits
This project makes use of the following third-party libraries:

 - [TSL-UMD](https://github.com/willosof/tsl-umd)
 - [SMPTE-TIMECODE](https://github.com/CrystalComputerCorp/smpte-timecode)
