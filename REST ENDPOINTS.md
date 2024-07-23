

# Rest Endpoints Overview
## Transport

**POST** localhost:5050/API/PVS/transport/play
**POST** localhost:5050/API/PVS/transport/pause
**POST** localhost:5050/API/PVS/transport/stop
**POST** localhost:5050/API/PVS/transport/toggle
**POST** localhost:5050/API/PVS/transport/jump/<+seconds>
**POST** localhost:5050/API/PVS/transport/jump/<-seconds>
**POST** localhost:5050/API/PVS/transport/end/<seconds>
**POST** localhost:5050/API/PVS/transport/times/playhead
Playhead Body (timecode):

    {
    "timecode": { "hours": 0, "minutes": 1, "seconds": 30, "frames": 0 }
    }
Playhead Body (percent)

    {
    "timecode": { "percentage": 0.50 }
    }

**GET** localhost:5050/API/PVS/transport/times/playhead
Returns timecode

    {
    	"frames": 1,
    	"seconds": 20,
    	"minutes": 1,
    	"hours": 0
    }

## Timeline

Set and get active clip on timeline

**POST** localhost:5050/API/PVS/timeline/active/id/<id>
**POST** localhost:5050/API/PVS/timeline/active/name/<name>
**POST** localhost:5050/API/PVS/timeline/active/clean-name/<cleanname>
**GET**  localhost:5050/API/PVS/timeline/active/clip
Return JSON like
 

     {
    	"UUID": "A0BF4748-D608-4F28-AC9F-828EF6167B63",
    	"plnName": "<filename>",
    	"cleanName": "<cleanname>",
    	"plnSourcePath": "<file path>",
    	"fps": "50.000000",
    	"duration": {
    		"hours": 0,
    		"minutes": 1,
    		"seconds": 2,
    		"frames": 23
    	},
    	"playbackBehavior": "LOOP",
    	"sizeString": "1920x1080",
    	"formatString": "hevc",
    	"t1": {
    		"hours": 0,
    		"minutes": 0,
    		"seconds": 0,
    		"frames": 0
    	},
    	"t2": {
    		"hours": 0,
    		"minutes": 0,
    		"seconds": 0,
    		"frames": 0
    	},
    	"trt": {
    		"hours": 0,
    		"minutes": 2,
    		"seconds": 0,
    		"frames": 0
    	},
    	"index": 3,
    	"isSelected": true
    }

## Timeline Queue

Navigate through the playlist.

**POST** localhost:5050/API/PVS/timeline/next
**POST** localhost:5050/API/PVS/timeline/previous
**POST** localhost:5050/API/PVS/timeline/recue
  

## Playlist

Get All Clips 		**GET** localhost:5050/API/PVS/playlist
Get Clip by ID 	**GET** localhost:5050/API/PVS/playlist/id/<id>
Get Clip by Name **GET** localhost:5050/API/PVS/playlist/name/<name>
Get Clip by Clean Name **GET** localhost:5050/API/PVS/playlist/clean-name/<cleanname>
Set Timer By ID **POST** localhost:5050/API/PVS/playlist/id/<id>/times

Set timer by ID JSON body:

    { "timer" : "t1",
    "timecode": {
      "hours": <h>,
      "minutes": <m>,
      "seconds": <s>,
      "frames": <f>
      }
    }
