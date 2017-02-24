// jshint esversion: 6, globalstrict: true, strict: true
'use strict';

const util = require('util');
const EventEmitter = require('events').EventEmitter;
const spawn = require('child_process').spawn;
const ERROR = 'error';
const STDOUT_DATA = 'stdoutData';
const STDERR_DATA = 'stderrData';
const STDIN_DATA = 'stdinData';
const FFMPEG_EXIT = 'ffmpegExit';
const WATCHDOG_FAIL = 'watchdogFail';

function FfmpegWatchdog(params, name = 'name', retry = 0, wait = 5, reset = 30, parseStdout = null, parseStderr = null, parseStdin = null) {
    if (!(this instanceof FfmpegWatchdog)) {
        return new FfmpegWatchdog(params, name, retry, wait, reset, parseStdout, parseStderr, parseStdin);
    }
    EventEmitter.call(this);
    this._params = this._validateParams(params);
    this._name = this._validateName(name);
    this._watchDog = {
        retry : this._validateNumberRange(retry, 0, 0, 100),
        wait : this._validateNumberRange(wait, 30, 5, 300),
        reset : this._validateNumberRange(reset, 30, 10, 300),
        timer : null,
        last : null,
        attempts : 0
    };
    this._ffmpeg = null;
    return this;
}

util.inherits(FfmpegWatchdog, EventEmitter);

//public, initiate
FfmpegWatchdog.prototype.init = function () {
    if (this._ffmpeg) {
        this._removeListeners();
        this._resetWatchDog();
    }
    this._spawn();
    return this;
};

//public, kill
FfmpegWatchdog.prototype.kill = function () {
    if (this._ffmpeg) {
        this._removeListeners();
        this._resetWatchDog();
        this._ffmpeg.kill('SIGKILL');
    }
    return this;
};

//public, check if process is running
FfmpegWatchdog.prototype.isRunning = function () {
    return (this._ffmpeg || this._ffmpeg.kill(0));
};

//public, get name
FfmpegWatchdog.prototype.getName = function () {
    return this._name;
};

//public, get params
FfmpegWatchdog.prototype.getParams = function () {
    return this._params.join(' ');
};

//private, spawn ffmpeg and add the event listeners
FfmpegWatchdog.prototype._spawn = function () {
    this._ffmpeg = spawn('ffmpeg', this._params);
    this._addListeners();
};

//private, add listeners
FfmpegWatchdog.prototype._addListeners = function () {
    this._ffmpeg.on('error', () => {throw new Error('FfmpegPiper says: "Unable to start ffmpeg! Are you sure it is installed?"');});
    this._ffmpeg.on('exit', (code, signal) => {this._ffmpegExit(code, signal);});
    this._ffmpeg.stdout.on('data', (data) => {this._emitStdoutData(data);});
    this._ffmpeg.stderr.on('data', (data) => {this._emitStderrData(data);});
    this._ffmpeg.stdin.on('data', (data) => {this._emitStdinData(data);});
};

//private, remove listeners
FfmpegWatchdog.prototype._removeListeners = function () {
    this._ffmpeg.removeAllListeners('error');
    this._ffmpeg.removeAllListeners('exit');
    this._ffmpeg.stdout.removeAllListeners('data');
    this._ffmpeg.stderr.removeAllListeners('data');
    this._ffmpeg.stdin.removeAllListeners('data');
};

//private, cancel watchDog timer and reset attempts
FfmpegWatchdog.prototype._resetWatchDog = function () {
    if (this._watchDog.retry > 0) {
        if (this._watchDog.timer) {
            clearTimeout(this._watchDog.timer);
            this._watchDog.timer = null;
        }
        if (this._watchDog.attempts > 0) {
            this._watchDog.attempts = 0;
        }
        if (this._watchDog.last) {
            this._watchDog.last = null;
        }
    }
    return this;
};

//private, called when watchDog setTimeout completes
FfmpegWatchdog.prototype._watchDogTimeout = function () {
    this._watchDog.timer = null;
    this._spawn();
};

//private, handle the ffmpeg exit event
FfmpegWatchdog.prototype._ffmpegExit = function (code, signal) {
    this._removeListeners();
    var message;
    switch (code) {
        case 0:
            message = 'Ffmpeg lost connection to video source and timed out.';
            break;
        case 1:
            message = 'Ffmpeg unable to connect to video source due to bad params or network trouble.';
            break;
        case 255:
            message = 'Ffmpeg was intentially killed with a quit command.';
            break;
        default:
            message = `Ffmpeg was intentionally killed using ${signal}.`;
            break;
    }
    if (this._watchDog.retry > 0) {
        var oldLast = this._watchDog.last;
        this._watchDog.last = Math.round(Date.now()/1000);
        //we can guesstimate that ffmpeg has been running good if no exiting has occured for ${this._watchDog.reset} seconds + ${this._watchDog.wait} time
        //when ffmpeg does exit, it usually happens immediately, unless there was a network interruption after successfully running
        //pipes may not be in use, therefore, we cannot rely on data event of pipe to inform us of ffmpeg running good
        if (oldLast && this._watchDog.last - oldLast > this._watchDog.wait + this._watchDog.reset && this._watchDog.attempts > 0) {
            this._watchDog.attempts = 0;
        }
        if (this._watchDog.attempts < this._watchDog.retry) {
            message += ` WatchDog will attempt to respawn ffmpeg in ${this._watchDog.wait} seconds.`;
            this._watchDog.attempts++;
            this._watchDog.timer = setTimeout(() => this._watchDogTimeout(), this._watchDog.wait * 1000);
            this.emit(ERROR, FFMPEG_EXIT, code, signal, message, this);
        } else {
            this.emit(ERROR, WATCHDOG_FAIL, code, signal, `WatchDog has failed to respawn ffmpeg after ${this._watchDog.retry} failed attempts.`, this);
        }
    } else {
        this.emit(ERROR, FFMPEG_EXIT, code, signal, message, this);
    }
};

//private, test ffmpeg params and throw error if invalid, currently only checks array length
FfmpegWatchdog.prototype._validateParams = function (array) {
    if (!Array.isArray(array) || array.length < 3) {
        //will add more checks to params later to verify order and combinations, maybe
        throw new Error('FfmpegPiper says: "Invalid array of ffmpeg parameters!"');
    }
    return array;
};

//private, validate name
FfmpegWatchdog.prototype._validateName = function (string) {
    if (!string) {
        string = 'name';
    }
    return string.replace(/\s/g,'') + '-' + this._getTimeStamp();
};

//private, validate numeric value
FfmpegWatchdog.prototype._validateNumberRange = function (number, def, low, high) {
    if (isNaN(number)) {
        return def;
    } else if (number < low) {
        return low;
    } else if (number > high) {
        return high;
    } else {
        return number;
    }
};

//private, emit event and pass data from ffmpeg.stdout
FfmpegWatchdog.prototype._emitStdoutData = function (data) {
    this.emit(STDOUT_DATA, data);
};

//private, emit event and pass data from ffmpeg.stderr
FfmpegWatchdog.prototype._emitStderrData = function (data) {
    this.emit(STDERR_DATA, data);
};

//private, emit event and pass data from ffmpeg.stdin
FfmpegWatchdog.prototype._emitStdinData = function (data) {
    this.emit(STDIN_DATA, data);
};

//private, creates an alphanumeric string based on current time
FfmpegWatchdog.prototype._getTimeStamp = function () {
    return Date.now().toString(36).toUpperCase();
};

//export constructor
module.exports = FfmpegWatchdog;
//ffmpeg stdout data event
module.exports.STDOUT_DATA = STDOUT_DATA;
//ffmpeg stderr data event
module.exports.STDERR_DATA = STDERR_DATA;
//ffmpeg stdin data event
module.exports.STDIN_DATA = STDIN_DATA;
//error event, grouping all events into just one and then can read type of error event passed
module.exports.ERROR = ERROR;
//ffmpeg error event type, exited after starting
module.exports.FFMPEG_EXIT = FFMPEG_EXIT;
//ffmpeg error event type, failed after exhausting the final retry attempt
module.exports.WATCHDOG_FAIL = WATCHDOG_FAIL;