//DualShock 3 Controller API, Copyright (©) 2017 Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com)

"use strict";

exports._init = function() {
	this.rPowL = 0; this.rDurL = 0; this.rPowR = 0;
	this.rDurR = 0; this.ledState = 0;
}

exports.setLed = function(state, two, three, four) {
	if(typeof two == "undefined") this.ledState = (state*2 & 0x1E);
	else this.ledState = (!!state*2)+(!!two*4)+(!!three*8)+(!!four*16);
	ds3Write(this);
}

exports.rumble = function(left, right, durLeft, durRight) {
	this.rPowL = (left & 0xFF), this.rPowR = (right & 0xFF),
	this.rDurL = (durLeft & 0xFF), this.rDurR = (durRight & 0xFF);
	if(!this.rDurL) this.rDurL = 254; if(!this.rDurR) this.rDurR = 254;
	ds3Write(this);
}

exports.rumbleAdd = function(left, right, durLeft, durRight) {
	if(left) this.rPowL=left<0?0:(left & 0xFF);
	if(right) this.rPowR=right<0?0:(right & 0xFF);
	if(durRight) this.rDurR=durRight<0?0:(durRight & 0xFF);
	if(durLeft) this.rDurL=durLeft<0?0:(durLeft & 0xFF);
	if(!this.rDurL) this.rDurL = 254; if(!this.rDurR) this.rDurR = 254;
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