//This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details.
//Node DualShock Library, Copyright (©) 2017 Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com)

"use strict";

const fs = require('fs'), hid = require('node-hid'), chalk = require('chalk');
function error(text, dt) { throw chalk.red("Error: ")+chalk.dim(text)+(dt?"\n"+dt:""); }
const RD_ERR = "Error: could not read from HID device", MAPDIR = __dirname+"/mapping/";

//Extra Useful Functions:
function obMax(o) {let k=Object.keys(o),i=0,l=k.length,m=0,s;for(;i<l;i++)if(o[k[i]]>m)m=o[k[i]],s=i;return k[s]}
//function arrDif(a,b) {let i=0,l=a.length;if(l!=b.length)return 1;for(;i<l;i++)if(a[i]!=b[i])return 1;return 0}
//function objDif(a,b) {for(let k=Object.keys(a),i=0,l=k.length;i<l;i++)if(a[k[i]]!=b[k[i]])return 1;return 0}//if(l!=Object.keys(b).length)return 1;
function objAdd(a,b) {for(let k=Object.keys(b),i=0,l=k.length;i<l;i++)a[k[i]]=b[k[i]]}

//Controller Mappings:
const dir = fs.readdirSync(MAPDIR), mapping = {}, api = {};
for(let i=0,l=dir.length,f; i<l; i++) {
	f = dir[i].split('.');
	if(f[1] == 'json') mapping[f[0]] = JSON.parse(fs.readFileSync(MAPDIR+dir[i], 'utf8'));
	else if(f[1] == 'js') api[f[0]] = require(MAPDIR+dir[i]);
}

//Get a list of available gamepads.
exports.getDevices = function(type) {
	const hidDev = hid.devices(), dev = [];
	for(let i=0,l=hidDev.length,d,t; i<l; i++) {
		d = hidDev[i]; t = getType(d);
		if(t) { d.type = t; d.mode = getMode(d); dev.push(d); }
	}
	if(type) {
		if(typeof type == "string") {
			type = type.toLowerCase();
			return dev.filter(function(d){return d.type==type});
		}
		error("'"+type+"' is not a supported controller type!");
	} else return dev;
}

//Get the model type of a gamepad.
exports.getType = getType; function getType(dev) {
	if(dev.type != null) return dev.type; const gKeys=Object.keys(mapping);
	for(let i=0,l=gKeys.length,m; i<l; i++) {
		m = mapping[gKeys[i]]; if(dev.vendorId == m.vendor
		&& dev.productId == m.product) return gKeys[i];
	}
	return false;
}

function getMode(dev) {
	const type = getType(dev), a = api[type];
	if(a && a._getMode) return a._getMode(dev);
	return false;
}

//Get a list of special features the gamepad supports.
exports.getFeatures = function(dev) {
	if(dev.map) return dev.map.special || [];
	let type = getType(dev);
	if(type)
	return false;
}

//Open a gamepad device for communication.
exports.open = function(dev, opt) {
	if(typeof opt != "object") opt = {};
	const gType = getType(dev);
	if(!gType) error("Provided device is not a supported controller!");
	try { var gmp = new hid.HID(dev.path); }
	catch(e) { error("Could not connect to the controller!", e); }
	//Gamepad API:
	var gFn = api[gType]; if(gFn) {
		if(gFn._init) gFn._init.call(gmp);
		for(var n=0,g=Object.keys(gFn),c=g.length,k; n<c; n++) {
			k = g[n]; if(k[0] != '_') gmp[k] = gFn[k].bind(gmp);
		}
	}
	//Internal Variables:
	gmp.type = gType; gmp.mode = dev.mode; gmp.map = mapping[gType];
	gmp.msData = {}; gmp.fData = {};
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
	var parser = (gFn&&gFn._parse) || parseInput; gmp.on("data", parser.bind(gmp));
	gmp.on("error", function(err) {if(err == RD_ERR) { if(gmp.ondisconnect) gmp.
	ondisconnect.call(gmp)} else if(gmp.onerror) gmp.onerror.call(gmp, err)});
	return gmp;
}

//Generic Gamepad API:
function parseInput(data) {
	var ofs = 0; if(data[0] == this.map['bt-id-byte']) {
		if(this.map['bt-offset']) ofs = this.map['bt-offset'];
	}
	var uTrig; if(this.ondigital || this.onupdate) { //Digital:
		var digital = parseDigital(data, this, ofs); if(!this.digital) this.digital = digital;
		uTrig = handle(digital, this.digital, this.ondigital?this.ondigital.bind(this):0);
	}
	if(this.onanalog || this.onupdate) { //Analog:
		var analog = parseAnalog(data, this, ofs); if(!this.analog) this.analog = analog;
		var trig = handle(analog, this.analog, this.onanalog?this.onanalog.bind(this):0);
		if(trig && this.onupdate) {if(!uTrig) uTrig = trig; else objAdd(uTrig, trig)}
	}
	if(this.onmotion && this.map.special.motion) { //Motion:
		var motion = parseMotion(data, this, ofs); if(!this.motion) this.motion = motion;
		var trig = handle(motion, this.motion, this.onmotion.bind?this.onmotion.bind(this):null);
		if(trig && this.onupdate) {if(!uTrig) uTrig = trig; else objAdd(uTrig, trig)}
	}
	if(this.onstatus && this.map.special.length) { //Status:
		var status = parseStatus(data, this, ofs); if(!this.status) this.status = status;
		var trig = handle(status, this.status, this.onstatus.bind?this.onstatus.bind(this):null);
		if(trig && this.onupdate) {if(!uTrig) uTrig = trig; else objAdd(uTrig, trig)}
	}
	if(uTrig && this.onupdate) this.onupdate.bind(this)(uTrig); //Frame Update.
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

//Parsing Assist:
function newDat() { return {
	get cross() {return this.a}, get circle() {return this.b},
	get square() {return this.x}, get triangle() {return this.y}
}}

function parseDigital(data, gpad, ofs) {
	var dArr=newDat(), map=gpad.map.button, keys=Object.keys(map);
	for(var i=0,l=keys.length; i<l; i++) {
		var key=keys[i], dPos=map[key][0]+ofs, dSub=map[key][1];
		dArr[key] = (data[dPos] & Math.pow(2,dSub)) != 0;
	}
	return dArr;
}

function parseAnalog(data, gpad, ofs) {
	var dArr=newDat(), map=gpad.map.analog, keys=Object.keys(map),
	sArr=gpad.msData, fArr=gpad.fData, sAmt=gpad.aSAmt, fAmt=gpad.aFAmt;
	for(var i=0,l=keys.length; i<l; i++) {
		var key=keys[i], dPos=map[key]+ofs, val=sAmt ? smooth(data[dPos],sArr[key],sAmt) : data[dPos];
		if(fAmt && typeof fArr[key] == "number") { val = filter(val, fArr[key], fAmt); fArr[key] = val; }
		dArr[key] = val;
	}
	return dArr;
}

function parseMotion(data, gpad, ofs) {
	var dArr={}, map=gpad.map.motion, keys=Object.keys(map),
	sArr=gpad.msData, fArr=gpad.fData, sAmt=gpad.mSAmt, fAmt=gpad.mFAmt;
	for(var i=0,l=keys.length; i<l; i++) {
		var key=keys[i], dPos=map[key]; if(typeof dPos == "object") {
			var val = (data[dPos[0]+ofs]>1 ? -data[dPos[1]+ofs] : 256-data[dPos[1]+ofs]);
			if(sAmt) val = smooth(val, sArr[key], sAmt);
			if(fAmt) { val = filter(val, fArr[key], fAmt); fArr[key] = val; }
			dArr[key] = val;
		}
	}
	return dArr;
}

function parseStatus(data, gpad, ofs) {
	var dArr={}, map=gpad.map.status, keys=Object.keys(map);
	for(var i=0,l=keys.length; i<l; i++) {
		var key=keys[i], mCon=map[key]; if(typeof mCon == "object") {
			var mDat = Object.assign({},mCon); delete mDat["index"];
			var dat=data[mCon["index"]+ofs],sKeys=Object.keys(mDat),mVal=obMax(mDat),lDst=mDat[mVal];
			for(var s=0,g=sKeys.length; s<g; s++) { var sKey=sKeys[s], sVal=mDat[sKey];
				if(typeof sVal == "number") { var dst=mDat[sKey]-dat; if(dst>=0&&dst<lDst) dArr[key]=sKey,lDst=dst; }
				else if(parseStatusExp(sVal, data, ofs)) { dArr[key]=sKey; break; }
			} if(!dArr[key]) dArr[key] = mVal;
		} else dArr[key] = data[mCon+ofs];
	}
	return dArr;
}

function parseStatusExp(arr, dat, ofs) {
	var tExp=0; for(var i=0,l=arr.length; i<l; i++) { var exp = arr[i];
	if(exp[2] ? dat[exp[0]+ofs]>=exp[1] : dat[exp[0]+ofs]<=exp[1]) tExp++; }
	return tExp == l;
}

function smooth(input, prevData, amt) {
	var sum = 0; prevData.push(input);
	if(prevData.length > amt) prevData.shift();
	for(var i=0,l=prevData.length; i<l; i++) { sum += prevData[i]; }
	return Math.floor(sum / prevData.length);
}

function filter(input, prevVal, amt) {
	if(Math.abs(input - 127) <= amt) return 127;
	if(Math.abs(input - prevVal) > amt) return input;
	return prevVal;
}

function handle(data, prev, func) {
	for(var keys=Object.keys(data),u={},i=0,l=keys.length; i<l; i++) {
		if(data[keys[i]] != prev[keys[i]]) { prev[keys[i]]=data[keys[i]]; u[keys[i]]=true; if(func)func(keys[i],data[keys[i]]); }
	} return Object.keys(u).length?u:false;
}