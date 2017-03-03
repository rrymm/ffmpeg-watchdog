// jshint esversion: 6, globalstrict: true, strict: true
'use strict';
var FW = require('../index');

//pipe:0 = stdin, pipe:1 = stdout, pipe:2 = stderr, all pipes can be used to stream data from ffmpeg, -loglevel should be set to "quiet" to utilize stderr

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
    name : 'video1',//name of video, helps to identify ffmpeg process when logging data to console
    retry : 5,//how many times watchdog should attempt to restart ffmpeg process that has exited
    wait : 10,//how many seconds should the watchdog wait to attempt to restart ffmpeg
    reset : 20,//how many seconds should ffmpeg be running to be considered good, used for resetting watchdog attempts
    stdinI2PC : 'mjpeg',//output on pipe:0 needs to be parsed into individual jpegs before emitting data
    stdoutI2PC : 'mjpeg',//output on pipe:1 needs to be parsed into individual jpegs before emitting data
    stderrI2PC : 'mjpeg'//output on pipe:2 needs to be parsed into individual jpegs before emitting data
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