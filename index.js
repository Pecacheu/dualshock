var fs = require('fs'),
hid = require('node-hid'),
chalk = require('chalk');

function JSONFl(itm) { return itm.substring(itm.length-5) == ".json"; }
function error(text, dt) { throw new Error(chalk.red("Error: ")+chalk.dim(text)+(dt?"\n"+dt:"")); }
function isDev(dev) { return dev.vendorId == this.vendor && dev.productId == this.product; }
const RD_ERR = "Error: could not read from HID device";

//Extra Useful Functions:
function obMax(o) {var k=Object.keys(o),i=0,l=k.length,m=0,s;for(;i<l;i++)if(o[k[i]]>m)m=o[k[i]],s=i;return k[s]}
//function arrDif(a,b) {var i=0,l=a.length;if(l!=b.length)return 1;for(;i<l;i++)if(a[i]!=b[i])return 1;return 0}
//function objDif(a,b) {for(var k=Object.keys(a),i=0,l=k.length;i<l;i++)if(a[k[i]]!=b[k[i]])return 1;return 0}//if(l!=Object.keys(b).length)return 1;
function objAdd(a,b) {for(var k=Object.keys(b),i=0,l=k.length;i<l;i++)a[k[i]]=b[k[i]]}

//Controller Mappings:
var mapDir = __dirname+"/mapping/", mapLst = fs.readdirSync(mapDir).filter(JSONFl), mapping = {};
for(var i=0,l=mapLst.length; i<l; i++) {
	mapping[mapLst[i].split('.')[0]] = JSON.parse(fs.readFileSync(mapDir+mapLst[i], 'utf8'));
} 
var supList = { //Custom Controller APIs:
	ds3: [ds3SetLed, ds3Rumble, ds3RumbleAdd],
	//ds4: [ds4SetLed, ds4Rumble, ds4RumbleAdd, ds4Parse]
};

//Get a list of available gamepads:
exports.getDevices = function(type) {
	if(typeof type == "string") {
		var devices = hid.devices(); type = type.toLowerCase();
		if(mapping[type]) return devices.filter(isDev.bind(mapping[type]));
	}
	error("'"+type+"' is not a supported controller type!");
}

//Open a gamepad device:
exports.open = function(device, options) {
	if(typeof options != "object") options = {};
	var gType, gKeys=Object.keys(mapping), l=gKeys.length, opt=options;
	for(var i=0;i<l;i++) if(isDev.call(mapping[gKeys[i]],device)) {gType=gKeys[i];break}
	if(!gType) error("Provided device is not a supported controller!");
	try { var gmp = new hid.HID(device.path); }
	catch(e) { error("Could not connect to the controller!", e); }
	//Gamepad Functions:
	var gFn = supList[gType]; if(gFn) { if(gFn[0]) gmp.setLed=gFn[0].bind(gmp);
	if(gFn[1]) gmp.rumble=gFn[1].bind(gmp), gmp.rumbleAdd=gFn[2].bind(gmp); }
	//Internal Variables:
	gmp.type = gType; gmp.rPowL = 0; gmp.rDurL = 0;
	gmp.rPowR = 0; gmp.rDurR = 0; gmp.ledState = [0,0,0];
	gmp.map = mapping[gType]; gmp.msData = {}; gmp.fData = {};
	//gmp.digital={}; gmp.analog={}; gmp.motion={}; gmp.status={};
	//Options Config:
	gmp.aSAmt = typeof opt.smoothAnalog == "number" ? opt.smoothAnalog : 5;
	gmp.aFAmt = typeof opt.joyDeadband == "number" ? opt.joyDeadband : 2;
	gmp.mSAmt = typeof opt.smoothMotion == "number" ? opt.smoothMotion : 5;
	gmp.mFAmt = typeof opt.moveDeadband == "number" ? opt.moveDeadband : 1;
	//Smoothing Data Storage:
	var aKeys = Object.keys(gmp.map.analog);
	for(var i=0,l=aKeys.length;i<l;i++) { gmp.msData[aKeys[i]]=[];
	if(aKeys[i].indexOf('Stick') == 1) gmp.fData[aKeys[i]] = 0; }
	if(gmp.map.motion) {
		var mKeys = Object.keys(gmp.map.motion);
		for(var i=0,l=mKeys.length;i<l;i++) { gmp.msData[mKeys[i]]=[]; gmp.fData[mKeys[i]] = 0; }
	}
	//Event Listeners:
	var parser = (gFn && gFn[3]) || genericParse; gmp.on("data", parser.bind(gmp));
	gmp.on("error", function(err) {if(err == RD_ERR) { if(gmp.ondisconnect) gmp.
	ondisconnect.call(gmp) } else if(gmp.onerror) gmp.onerror.call(gmp, err)});
	return gmp;
}

//Get the model name of a gamepad:
exports.getType = function(gamepad) {
	if(gamepad.type) return gamepad.type;
	var gKeys=Object.keys(mapping), fil=isDev.bind(gamepad);
	for(var i=0,l=gKeys.length;i<l;i++) if(fil(gKeys[i])) return gKeys[i];
	return false;
}

//Get a list of special features the gamepad supports:
exports.getFeatures = function(gamepad) {
	if(gamepad.map) return gamepad.map.special || [];
	return false;
}

//Generic Gamepad API:
function genericParse(data) {
	var uTrig; if(this.ondigital || this.onupdate) { //Digital:
		var digital = parseDigital(data, this); if(!this.digital) this.digital = digital;
		uTrig = handle(digital, this.digital, this.ondigital?this.ondigital.bind(this):0);
	}
	if(this.onanalog || this.onupdate) { //Analog:
		var analog = parseAnalog(data, this); if(!this.analog) this.analog = analog;
		var trig = handle(analog, this.analog, this.onanalog?this.onanalog.bind(this):0);
		if(trig && this.onupdate) {if(!uTrig) uTrig = trig; else objAdd(uTrig, trig)}
	}
	if(this.onmotion && this.map.special.motion) { //Motion:
		var motion = parseMotion(data, this); if(!this.motion) this.motion = motion;
		var trig = handle(motion, this.motion, this.onmotion.bind(this));
		if(trig && this.onupdate) {if(!uTrig) uTrig = trig; else objAdd(uTrig, trig)}
	}
	if(this.onstatus && this.map.special.charge) { //Status:
		var status = parseStatus(data, this); if(!this.status) this.status = {};
		var trig = handle(status, this.status, this.onstatus.bind(this));
		if(trig && this.onupdate) {if(!uTrig) uTrig = trig; else objAdd(uTrig, trig)}
	}
	if(uTrig && this.onupdate) this.onupdate.bind(this)(uTrig); //Frame Update.
}

//DualShock 3 API:
function ds3SetLed(state, two, three, four) {
	if(typeof two == "undefined") this.ledState = [(state*2 & 0x1E)];
	else this.ledState = [(!!state*2)+(!!two*4)+(!!three*8)+(!!four*16)];
	ds3Write(this);
}
function ds3Rumble(left, right, durLeft, durRight) {
	this.rPowL = (left & 0xFF), this.rPowR = (right & 0xFF),
	this.rDurL = (durLeft & 0xFF), this.rDurR = (durRight & 0xFF);
	if(!this.rDurL) this.rDurL = 254; if(!this.rDurR) this.rDurR = 254;
	ds3Write(this);
}
function ds3RumbleAdd(left, right, durLeft, durRight) {
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
		dev.ledState[0], //LED State
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
//var prevData = [{},{},{},{},{}], nLedVal = 0;
/*function ds3Parse(data) {
	//data[6] = data[6]/2; data[7] = data[7]/2; data[8] = data[8]/2; data[9] = data[9]/2;
	//buf[40] = 0; buf[41] = 0; buf[42] = 0; buf[43] = 0; buf[44] = 0; buf[46] = 0;
	//for(var i=0; i<buf.length; i++) { if(buf[i] != prevData[i]) { dif = true; break; } }
	var button, analog = parseAnalog(data, this), aKeys = Object.keys(analog), difA = 0, difM = 0, difS = 0, difD = 0;
	if(objDif(analog, this.prevAnalog)) difA = true;
	if(!difA) {
		analog = parseMotion(data, this); aKeys = Object.keys(analog); if(objDif(analog, this.prevMotion)) difM = true;
	}
	if(!difA && !difM) {
		analog = parseDigital(data, this); aKeys = Object.keys(analog); if(objDif(analog, this.prevDigital)) difD = true;
	}
	if(!difA && !difM && !difD) {
		analog = parseStatus(data, this); aKeys = Object.keys(analog); if(objDif(analog, this.prevStatus)) difS = true;
	}
	if(difA || difM || difD || difS) {
		if(difA || difM || difS) {
			console.log("------------- "+(difA ? "ANALOG" : difM ? "MOTION" : "STATUS")+" -------------");
			console.log("-- ", data);
			for(var i=0; i<aKeys.length; i++) {
				console.log(aKeys[i]+" = "+analog[aKeys[i]]);
			}
		}
	} else {
		var dif = false, rmArr = [6,7,8,9,14,15,16,17,18,19,20,21,22,23,24,25,41,42,43,44,45,46,47,48];
		for(var m=0,k=rmArr.length; m<k; m++) data[rmArr[m]] = 0;
		for(var i=0,l=data.length; i<l; i++) if(data[i] != this.prevStatus[i]) { dif = true; break; }
		if(dif) console.log("-------------  RAW  --------------\n-- ", data);
		this.prevStatus = data;
	}
}*/

//DualShock 4 API:
//>>>>> (UNPROVEN) <<<<<
function ds4SetLed(r, g, b) { this.ledState = [(r & 0xFF), (g & 0xFF), (b & 0xFF)]; ds4Write(this); }
function ds4Rumble(left, right) {
	//if(typeof durLeft != "number") durLeft = 254;
	//if(typeof durRight != "number") durRight = 254;
	this.rPowL = (left & 0xFF), this.rPowR = (right & 0xFF);
	//this.rDurL = (durLeft & 0xFF), this.rDurR = (durRight & 0xFF);
	ds4Write(this);
}
function ds4Write(dev) { //>>>> UNPROVEN! <<<<
	gamepad.write([
		0x05, 0xff, 0x04, 0x00,
		dev.rPowR, //Rumble Power Right
		dev.rPowL, //Rumble Power Left
		dev.ledState[0], //LED Red
		dev.ledState[1], //LED Green
		dev.ledState[2], //LED Blue
		0, //data.flashOn,
		0 //data.flashOff
	]);
}
function ds4Parse(data) {
	console.log(data);
}

//Parsing Assist:
function parseDigital(data, gpad) {
	var dArr={}, map=gpad.map.button, keys=Object.keys(map);
	for(var i=0,l=keys.length; i<l; i++) {
		var key=keys[i], dPos=map[key][0], dSub=map[key][1];
		dArr[key] = (data[dPos] & Math.pow(2,dSub)) != 0;
	}
	return dArr;
}

function parseAnalog(data, gpad) {
	var dArr={}, map=gpad.map.analog, keys=Object.keys(map),
	sArr=gpad.msData, fArr=gpad.fData, sAmt=gpad.aSAmt, fAmt=gpad.aFAmt;
	for(var i=0,l=keys.length; i<l; i++) {
		var key=keys[i], dPos=map[key], val=sAmt ? smooth(data[dPos],sArr[key],sAmt) : data[dPos];
		if(fAmt && typeof fArr[key] == "number") { val = filter(val, fArr[key], fAmt); fArr[key] = val; }
		dArr[key] = val;
	}
	return dArr;
}

function parseMotion(data, gpad) {
	var dArr={}, map=gpad.map.motion, keys=Object.keys(map), sArr=gpad.msData,
	fArr=gpad.fData, sAmt=gpad.mSAmt, fAmt=gpad.mFAmt; //, vMax=Math.pow(2,map.bits)-1;
	for(var i=0,l=keys.length; i<l; i++) {
		var key=keys[i], dPos=map[key]; if(typeof dPos == "object") {
			var val = (data[dPos[0]]>1 ? -data[dPos[1]] : 256-data[dPos[1]]);
			if(sAmt) val = smooth(val, sArr[key], sAmt);
			if(fAmt) { val = filter(val, fArr[key], fAmt); fArr[key] = val; }
			dArr[key] = val;
		}
	}
	return dArr;
}

function parseStatus(data, gpad) {
	var dArr={}, map=gpad.map.status, keys=Object.keys(map);
	for(var i=0,l=keys.length; i<l; i++) {
		var key=keys[i], mCon=map[key]; if(typeof mCon == "object") {
			var mDat = Object.assign({},mCon); delete mDat["index"];
			var dat=data[mCon["index"]],sKeys=Object.keys(mDat),mVal=obMax(mDat),lDst=mDat[mVal];
			for(var s=0,g=sKeys.length; s<g; s++) { var sKey=sKeys[s], sVal=mDat[sKey];
				if(typeof sVal == "number") { var dst=mDat[sKey]-dat; if(dst>=0&&dst<lDst) dArr[key]=sKey,lDst=dst; }
				else if(parseStatusExp(sVal, data)) { dArr[key]=sKey; break; }
			} if(!dArr[key]) dArr[key] = mVal;
		} else dArr[key] = data[mCon];
	}
	return dArr;
}

function parseStatusExp(arr, dat) {
	var tExp=0; for(var i=0,l=arr.length; i<l; i++) { var exp = arr[i];
	if(exp[2] ? dat[exp[0]]>=exp[1] : dat[exp[0]]<=exp[1]) tExp++; }
	return tExp == l;
}

function smooth(input, prevData, amt) {
	var sum = 0; prevData.push(input);
	if(prevData.length > amt) prevData.shift();
	for(var i=0,l=prevData.length; i<l; i++) { sum += prevData[i]; }
	return Math.floor(sum / prevData.length);
}

function filter(input, prevVal, amt) {
	if(Math.abs(input - prevVal) > amt) return input;
	return prevVal;
}

function handle(data, prev, func, update) {
	for(var keys=Object.keys(data),u={},i=0,l=keys.length; i<l; i++) {
		if(data[keys[i]] != prev[keys[i]]) { prev[keys[i]]=data[keys[i]]; u[keys[i]]=true; if(func)func(keys[i],data[keys[i]]); }
	} return Object.keys(u).length?u:false;
}