// jshint esversion: 6, globalstrict: true, strict: true
'use strict';
var FW = require('ffmpeg-watchdog');

//pipe:0 = stdin, pipe:1 = stdout, pipe:2 = stderr, all pipes can be used to stream data from ffmpeg, -loglevel should be set to "quiet" to utilize stderr
var rtsp = ['-loglevel', 'quiet', '-max_delay', '0', '-f', 'rtsp', '-rtsp_transport', 'udp', '-stimeout', '10000000', '-i', 'rtsp://50.73.56.89:554/axis-media/media.amp', '-c:v', 'copy', '-f', 'mpegts', 'pipe:0', '-c:v', 'copy', '-f', 'mp4', '-movflags', '+empty_moov', 'pipe:1', '-c:v', 'copy', '-f', 'flv', 'pipe:2'];

var ffmpeg = new FW(rtsp, 'rtspCam', 5, 5, 20, null, null, null)
    .on(FW.ERROR, (type, code, signal, message, target) => handleError(type, code, signal, message, target))
    .on(FW.STDOUT_DATA, function (data) {
        console.log(ffmpeg.getName(), FW.STDOUT_DATA, data.length);
    })
    .on(FW.STDERR_DATA, function (data) {
        console.log(ffmpeg.getName(), FW.STDERR_DATA, data.length);
    })
    .on(FW.STDIN_DATA, function (data) {
        console.log(ffmpeg.getName(), FW.STDIN_DATA, data.length);
    })
    .init();

function handleError(type, code, signal, message, target) {
    console.log(`Error handled for ${target.getName()}`);
    console.log(`Command: ffmpeg ${target.getParams()}`);
    console.log('type:', type, '\ncode:', code, '\nsignal:', signal, '\nmessage:', message);
    //check which type of error we have, ffmpegExit or watchdogFail
    switch (type) {
        case FW.FFMPEG_EXIT:
            //ffmpeg exited, check code or signal or message
            break;
        case FW.WATCHDOG_FAIL:
            //watchDog is reporting that all attempts at respawning ffmpeg have failed
            break;
    }
}