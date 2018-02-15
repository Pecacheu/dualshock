//DualShock 4 Controller API, Copyright (©) 2017 Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com)

"use strict";
const crc = require('../crc');

exports._init = function() {
	this.rPowL = 0, this.rPowR = 0, this.ledState = [0,0,0,0,0];
}

exports._parse = function(data,chg) {
	//Reset finger smoothing data on touchpad press:
	if(chg.t1 && this.digital.t1) this.msData.t1X=[], this.msData.t1Y=[];
	if(chg.t2 && this.digital.t2) this.msData.t2X=[], this.msData.t2Y=[];
}

exports._getMode = function(dev) {
	return dev.release==0?"bluetooth":"usb";
}

exports.setLed = function(r, g, b, flashOn, flashOff) {
	let s = this.ledState;
	for(let i=0; i<5; i++) if(arguments[i] != null) s[i] = arguments[i]||0;
	ds4Write(this);
}

exports.rumble = function(left, right) {
	this.rPowL = left||0, this.rPowR = right||0;
	ds4Write(this);
}

exports.rumbleAdd = function(left, right) {
	if(left>0) this.rPowL = left; if(right>0) this.rPowR = right;
	ds4Write(this);
}

function ds4Write(dev) {
	if(dev.mode == 'usb') dev.write([
		0x05, 0xff, 0x04, 0x00,
		dev.rPowR, //Rumble Power Right
		dev.rPowL, //Rumble Power Left
		dev.ledState[0], //LED Red
		dev.ledState[1], //LED Green
		dev.ledState[2], //LED Blue
		dev.ledState[3], //LED Flash On
		dev.ledState[4] //LED Flash Off
	]); else {
		//ALT FROM DS4WINDOWS
		/*const msg = new Array(78).fill(0);
		msg[0] = 0x11;
		msg[1] = 0x80;
		msg[3] = 0xff;
		msg[6] = dev.rPowR; //fast motor
		msg[7] = dev.rPowL; //slow motor
		msg[8] = dev.ledState[0]; //red
		msg[9] = dev.ledState[1]; //green
		msg[10] = dev.ledState[2]; //blue
		msg[11] = dev.ledState[3]; //flash on duration
		msg[12] = dev.ledState[4]; //flash off duration*/
		const msg = [ //ALT FROM GITHUB POST
			0xa2, 0x11, 0x80, 0x00, 0x0f, 0x00, 0x00,
			dev.rPowR, //Rumble Power Right
			dev.rPowL, //Rumble Power Left
			dev.ledState[0], //LED Red
			dev.ledState[1], //LED Green
			dev.ledState[2], //LED Blue
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
		];
		/*const msg = [ //FROM PS4 DEV WIKI
			0xa2, 0x11, 0xc0, 0x20, 0xf0, 0x04, 0x00,
			dev.rPowR, //Rumble Power Right
			dev.rPowL, //Rumble Power Left
			dev.ledState[0], //LED Red
			dev.ledState[1], //LED Green
			dev.ledState[2], //LED Blue
			dev.ledState[3], //LED Flash On
			dev.ledState[4], //LED Flash Off
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43, 0x43, 0x00, 0x4d, 0x85, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
		];*/
		const crc32 = crc.crc32(msg), rev = false;
		if(rev) {
		msg[75] = crc32[3];
		msg[76] = crc32[2];
		msg[77] = crc32[1];
		msg[78] = crc32[0];
		} else {
		msg[75] = crc32[0];
		msg[76] = crc32[1];
		msg[77] = crc32[2];
		msg[78] = crc32[3];
		}
		//let s = ''; msg.forEach(function(e) { s += "0x"+(e?e.toString(16):'00')+", "; }); console.log(s.substr(0,s.length-2));
		msg.shift(); //Remove 0xa2 at start.
		dev.write(msg, true);
	}
}