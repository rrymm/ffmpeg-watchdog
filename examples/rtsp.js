// jshint esversion: 6, globalstrict: true, strict: true
'use strict';
var FW = require('ffmpeg-watchdog');

var params = [
    '-loglevel',
    'quiet',
    '-max_delay',
    '0',
    '-f',
    'rtsp',
    '-rtsp_transport',
    'udp',
    '-stimeout',
    '10000000',
    '-i',
    'rtsp://50.73.56.89:554/axis-media/media.amp',
    '-c:v',
    'copy',
    '-f',
    'mpegts',
    'pipe:0',
    '-c:v',
    'copy',
    '-f',
    'mp4',
    '-movflags',
    '+empty_moov',
    'pipe:1',
    '-c:v',
    'copy',
    '-f',
    'flv',
    'pipe:2'
];

var options = {
    name : 'video1',//name of video, helps to identify ffmpeg process when logging data to console
    retry : 5,//how many times watchdog should attempt to restart ffmpeg process that has exited
    wait : 10,//how many seconds should the watchdog wait to attempt to restart ffmpeg
    reset : 20//how many seconds should ffmpeg be running to be considered good, used for resetting watchdog attempts
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

//check which type of error we have, ffmpegExit or watchdogFail
function handleError(type, code, signal, message, target) {
    console.log(`Error handled for ${target.getName()}`);
    console.log(`Command: ffmpeg ${target.getParams()}`);
    console.log('type:', type, '\ncode:', code, '\nsignal:', signal, '\nmessage:', message);
    switch (type) {
        case FW.FFMPEG_EXIT:
            //ffmpeg exited, check code or signal or message
            break;
        case FW.WATCHDOG_FAIL:
            //watchDog is reporting that all attempts at respawning ffmpeg have failed
            break;
    }
}