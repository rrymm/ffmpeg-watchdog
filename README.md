#ffmpeg-watchdog
Monitor an ffmpeg process and automatically respawn it if it has exited. Designed to be used when connecting to remote video sources that may be intermittent. Best used when timeout flags are passed to ffmpeg.

###installation:
``` 
npm install ffmpeg-watchdog
```
###usage:
```
const FW = require('ffmpeg-watchdog');

var params = [
    '-loglevel',
    'quiet',
    '-f',
    'mjpeg',
    '-timeout',
    '10000000',
    '-i',
    'http://came3.nkansai.ne.jp:81/nphMotionJpeg?Resolution=640x480&Quality=Motion',
    
    /*stdin*/
    
    '-c:v',
    'mjpeg',
    '-r',
    '10',
    '-q:v',
    '2',
    '-s',
    '160x120',
    '-f', 'image2pipe',
    'pipe:0',

    /*stdout*/

    '-c:v',
    'mjpeg',
    '-r',
    '5',
    '-q:v',
    '1',
    '-s',
    '320x240',
    '-f',
    'image2pipe',
    'pipe:1',
    
    /*stderr*/
    
    '-c:v',
    'mjpeg',
    '-r',
    '2',
    '-q:v',
    '1',
    '-s',
    '640x480',
    '-f',
    'image2pipe',
    'pipe:2'
];

var options = {
    name : 'video1',
    retry : 5,
    wait : 10,
    reset : 20,
    stdoutI2PC : 'mjpeg',
    stderrI2PC : 'mjpeg',
    stdinI2PC : 'mjpeg'
};

//create new instance and attach listeners and call .init() to start
var video1 = new FW(params, options)
    .on(FW.ERROR, (type, code, signal, message, target) => handleError(type, code, signal, message, target))
    .on(FW.STDOUT_DATA, function (data) {
        console.log(video1.getName(), FW.STDOUT_DATA, data.length);
    })
    .on(FW.STDERR_DATA, function (data) {
        console.log(video1.getName(), FW.STDERR_DATA, data.length);
    })
    .on(FW.STDIN_DATA, function (data) {
        console.log(video1.getName(), FW.STDIN_DATA, data.length);
    })
    .init();
```

**params(array):** an array of ffmpeg flags that you would normally pass to ffmpeg on the command line.

**options(object):** an object with various options that control the ffmpeg-watchdog instance

**options.name:** name of video, helps to identify ffmpeg process when logging data to console

**options.retry(0 - 300):** how many times should watchdog attempt to restart ffmpeg process that has exited

**options.wait(5 - 300):** how many seconds should watchdog wait to attempt to restart ffmpeg

**options.reset(10 - 300):** how many seconds should ffmpeg be running to be considered successful

**options.stdoutI2PC:** set image2pipe codec to "mjpeg" if output on pipe:1 needs to be parsed into individual jpegs before emitting data 

**options.stderrI2PC:** set image2pipe codec to "mjpeg" if output on pipe:2 needs to be parsed into individual jpegs before emitting data

**options.stdinI2PC:** set image2pipe codec to "mjpeg" if output on pipe:0 needs to be parsed into individual jpegs before emitting data

#Warning
If setting stdoutI2PC, stderrI2PC, or stdinI2PC to "mjpeg" please ensure that you are using -c:v mjpeg and -f image2pipe in the ffmpeg params for that pipe, otherwise the buffer will not flush and your app will crash!

Please take a look in the <a href="https://github.com/kevinGodell/ffmpeg-watchdog/tree/master/examples">examples folder</a>. There is an example for <a href="https://github.com/kevinGodell/ffmpeg-watchdog/blob/master/examples/http.js">http</a> and <a href="https://github.com/kevinGodell/ffmpeg-watchdog/blob/master/examples/rtsp.js">rtsp</a> remote video sources.



-kevinGodell