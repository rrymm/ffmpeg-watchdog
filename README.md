# ffmpeg-watchdog
Monitor an ffmpeg process and automatically respawn it if it has exited. Designed to be used when connecting to remote video sources that may be intermittent. Best used when timeout flags are passed to ffmpeg.

`installation`:
``` 
npm install ffmpeg-watchdog
```
`usage`:
```
const FW = require('ffmpeg-watchdog');

var stream1 = new FW(ffmpegParams, videoName, watchdogRetry, watchdogWait, watchdogReset);

stream1.on(FW.ERROR, function (type, code, signal, message, target) {
    doSomethingWithError;
});

stream1.on(FW.STDOUT_DATA, function (data) {
    doSomethingWithData;
});

stream1.init();//starts the process

stream1.kill();//kills the process
```

-`ffmpegParams(array)`: an array of ffmpeg flags that you would normally pass to ffmpeg on the command line.

-`cameraName(string)`: a unique name that you assign to the instance which can be used when logging or debugging

-`watchdogRetry(number 0 - 100)`: how many attempts at respawning a new ffmpeg process to reconnect to a video source, set to 0 to turn off

`watchdogWait(number 5 - 300)`: how long to wait after detecting that ffmpeg has exited before spawning a new process

`watchdogReset(number 10 - 300)`: how many seconds will ffmpeg have to run without exiting to be considered successful, used for resetting watchdog respawn attemps

Please take a look in the <a href="https://github.com/kevinGodell/ffmpeg-watchdog/blob/master/examples/">examples folder</a>. There is an example for <a href="https://github.com/kevinGodell/ffmpeg-watchdog/blob/master/examples/http.js">http</a> and <a href="https://github.com/kevinGodell/ffmpeg-watchdog/blob/master/examples/rtsp.js">rtsp</a> remote video sources.



-kevinGodell