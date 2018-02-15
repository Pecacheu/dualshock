//DualShock 3 Controller API, Copyright (©) 2017 Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com)

"use strict";

exports._init = function() {
	this.rPowL = 0, this.rDurL = 0, this.rPowR = 0,
	this.rDurR = 0, this.ledState = 0;
}

exports.setLed = function(state, two, three, four) {
	if(typeof two == "undefined") this.ledState = (state*2 & 0x1E);
	else this.ledState = (!!state*2)+(!!two*4)+(!!three*8)+(!!four*16);
	ds3Write(this);
}

exports.rumble = function(left, right, durLeft, durRight) {
	this.rPowL = left||0, this.rPowR = right||0, this.rDurL = durLeft, this.rDurR = durRight;
	if(!durLeft) this.rDurL = 254; if(!durRight) this.rDurR = 254;
	ds3Write(this);
}

exports.rumbleAdd = function(left, right, durLeft, durRight) {
	if(left>0) this.rPowL=left; if(right>0) this.rPowR=right;
	if(durRight>0) this.rDurR=durRight; else if(!this.rDurR) this.rDurR = 254;
	if(durLeft>0) this.rDurL=durLeft; else if(!this.rDurL) this.rDurL = 254;
	ds3Write(this);
}

function ds3Write(dev) {
	dev.write([
		0x01/*Report ID*/, 0x00,
		dev.rDurR, //Rumble Duration Right
		dev.rPowR, //Rumble Power Right
		dev.rDurL, //Rumble Duration Left
		dev.rPowL, //Rumble Power Left
		0x00, 0x00, 0x00, 0x00,
		dev.ledState, //LED State
		0xff, 0x27, 0x10, 0x00, 0x32,
		0xff, 0x27, 0x10, 0x00, 0x32,
		0xff, 0x27, 0x10, 0x00, 0x32,
		0xff, 0x27, 0x10, 0x00, 0x32,
		0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00, 0x00, 0x00,
		0x00, 0x00, 0x00
	]);
}