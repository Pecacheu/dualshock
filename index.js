//Node DualShock Library, ©2022 Pecacheu. GNU GPL v3.0
import fs from 'fs'; import hid from 'node-hid'; import chalk from 'chalk';
import {fileURLToPath} from 'url'; const RD_ERR="Error: could not read from HID device",
MAPDIR=new URL('.',import.meta.url)+"mapping/", MAPPATH=fileURLToPath(MAPDIR);

//Extra Useful Functions:
function error(text, dt) { throw chalk.red("Error: ")+chalk.dim(text)+(dt?"\n"+dt:""); }
function obMax(o) {let k=Object.keys(o),i=0,l=k.length,m=0,s;for(;i<l;i++)if(o[k[i]]>m)m=o[k[i]],s=i;return k[s]}
function objAdd(a,b) {for(let k=Object.keys(b),i=0,l=k.length;i<l;i++)a[k[i]]=b[k[i]]}

//Controller Mappings:
const dir=fs.readdirSync(MAPPATH), mapping={}, api={};
for(let i=0,l=dir.length,f; i<l; i++) {
	f=dir[i].split('.');
	if(f[1] == 'json') mapping[f[0]] = JSON.parse(fs.readFileSync(MAPPATH+dir[i], 'utf8'));
	else if(f[1] == 'js') api[f[0]] = await import(MAPDIR+dir[i]);
}

//Get a list of available gamepads.
export function getDevices(type) {
	const hidDev=hid.devices(), dev=[];
	for(let i=0,l=hidDev.length,d,t,s; i<l; i++) {
		d=hidDev[i]; t=getTypeAndStyle(d); s=t[1]; t=t[0];
		if(t) { d.type=t; d.style=s; d.mode=getMode(d); dev.push(d); }
	}
	if(type) {
		if(typeof type == "string") {
			type=type.toLowerCase();
			return dev.filter(function(d){return d.type==type});
		}
		error("'"+type+"' is not a supported controller type!");
	} else return dev;
}

//Get the model type of a gamepad.
export function getType(dev) { return getTypeAndStyle(dev)[0]; }

function getTypeAndStyle(dev) {
	if(dev.type != null) return [dev.type,dev.style]; const gk=Object.keys(mapping);
	for(let i=0,l=gk.length,m; i<l; i++) {
		m=mapping[gk[i]]; if(dev.vendorId == m.vendor) {
			if(typeof m.product == 'object') {
				const s=m.product, p=Object.keys(s);
				for(let a=0,b=p.length; a<b; a++) {
					if(dev.productId == p[a]) return [gk[i],s[p[a]]];
				}
			} else if(dev.productId == m.product) return [gk[i],null];
		}
	}
	return [false,null];
}

function getMode(dev) {
	const type=getType(dev), a=api[type];
	if(a && a._getMode) return a._getMode(dev);
	return null;
}

//Get a list of special features the gamepad supports.
export function getFeatures(dev) {
	const type=getType(dev), m=mapping[type];
	if(m) return m.special || []; return false;
}

//Open a gamepad device for communication.
export function open(dev, opt) {
	if(typeof opt != "object") opt={};
	let gType=getTypeAndStyle(dev), gStyle=gType[1], gmp; gType=gType[0];
	if(!gType) error("HID device is not a supported controller!");
	try {gmp=new hid.HID(dev.path)} catch(e) { error("Could not connect to the controller!", e); }
	//Gamepad API:
	const gFn=api[gType]; if(gFn) {
		if(gFn._init) gFn._init.call(gmp);
		if(gFn._parse) gmp.parser=gFn._parse.bind(gmp);
		for(let n=0,g=Object.keys(gFn),c=g.length,k; n<c; n++) {
			k=g[n]; if(k[0] != '_') gmp[k]=gFn[k].bind(gmp);
		}
	}
	//Internal Variables:
	gmp.type=gType; if(gStyle) gmp.style=gStyle; if(dev.mode) gmp.mode=dev.mode;
	gmp.msData={}; gmp.fData={}; gmp.map=Object.assign({},mapping[gType]);
	if(gmp.map.special) {
		const s=gmp.map.special, s2={};
		for(let i=0,l=s.length; i<l; i++) s2[s[i]]=true;
		gmp.map.special=s2;
	}
	//Options Config:
	gmp.aSAmt = typeof opt.smoothAnalog == "number" ? opt.smoothAnalog : 5;
	gmp.aFAmt = typeof opt.joyDeadband == "number" ? opt.joyDeadband : 2;
	gmp.mSAmt = typeof opt.smoothMotion == "number" ? opt.smoothMotion : 5;
	gmp.mFAmt = typeof opt.moveDeadband == "number" ? opt.moveDeadband : 1;
	//Smoothing Data Storage:
	const aKeys=Object.keys(gmp.map.analog);
	for(let i=0,l=aKeys.length;i<l;i++) {
		gmp.msData[aKeys[i]]=[]; if(aKeys[i].indexOf('Stick') == 1) gmp.fData[aKeys[i]]=0;
	}
	if(gmp.map.motion) {
		const mKeys=Object.keys(gmp.map.motion);
		for(let i=0,l=mKeys.length;i<l;i++) { gmp.msData[mKeys[i]]=[]; gmp.fData[mKeys[i]]=0; }
	}
	//Event Listeners:
	gmp.on("data", parseInput.bind(gmp));
	gmp.on("error", function(err) {if(err == RD_ERR) { if(gmp.ondisconnect) gmp.
	ondisconnect.call(gmp)} else if(gmp.onerror) gmp.onerror.call(gmp, err)});
	return gmp;
}

//Generic Gamepad API:
function parseInput(data) {
	let ofs=0; if(data[0] == this.map['bt-id-byte']) {
		if(this.map['bt-offset']) ofs=this.map['bt-offset'];
	}
	let uTrig,trig; if(this.ondigital || this.onupdate) { //Digital:
		const digital=parseDigital(data, this, ofs); if(!this.digital) this.digital=digital;
		uTrig=handle(digital, this.digital, this.ondigital?this.ondigital.bind(this):0);
	}
	if(this.onanalog || this.onupdate) { //Analog:
		const analog=parseAnalog(data, this, ofs); if(!this.analog) this.analog=analog;
		trig=handle(analog, this.analog, this.onanalog?this.onanalog.bind(this):0);
		if(trig && this.onupdate) {if(!uTrig) uTrig=trig; else objAdd(uTrig, trig)}
	}
	if(this.onmotion && this.map.special.motion) { //Motion:
		const motion=parseMotion(data, this, ofs); if(!this.motion) this.motion=motion;
		trig=handle(motion, this.motion, this.onmotion.bind?this.onmotion.bind(this):null);
		if(trig && this.onupdate) {if(!uTrig) uTrig=trig; else objAdd(uTrig, trig)}
	}
	if(this.onstatus && this.map.special) { //Status:
		const status=parseStatus(data, this, ofs); if(!this.status) this.status=status;
		trig=handle(status, this.status, this.onstatus.bind?this.onstatus.bind(this):null);
		if(trig && this.onupdate) {if(!uTrig) uTrig=trig; else objAdd(uTrig, trig)}
	}
	if(this.parser) { //Custom:
		if(!uTrig) uTrig={}; trig=this.parser(data,uTrig,ofs);
		if(trig && this.onupdate) objAdd(uTrig, trig); if(!Object.keys(uTrig).length) uTrig=null;
	}
	if(uTrig && this.onupdate) this.onupdate.call(this,uTrig); //Frame Update.
}

//Parsing Assist:
function newDat() { return {
	get cross() {return this.a}, set cross(v) {},
	get circle() {return this.b}, set circle(v) {},
	get square() {return this.x}, set square(v) {},
	get triangle() {return this.y}, set triangle(v) {}
}}

function parseDigital(data, gpad, ofs) {
	const dArr=newDat(), map=gpad.map.button, keys=Object.keys(map);
	for(let i=0,l=keys.length,key,dPos,dSub; i<l; i++) {
		key=keys[i]; if(key == 'hat') {
			dSub=data[map[key]+ofs] & 0x0F;
			let u=false,d=false,l=false,r=false;
			switch(dSub) {
				case 0: u=true; break; case 1: u=r=true; break;
				case 2: r=true; break; case 3: d=r=true; break;
				case 4: d=true; break; case 5: d=l=true; break;
				case 6: l=true; break; case 7: u=l=true;
			}
			dArr['up']=u; dArr['down']=d;
			dArr['left']=l; dArr['right']=r;
		} else {
			dPos=map[key][0]+ofs, dSub=map[key][1];
			dArr[key]=(data[dPos] & 1<<dSub) != 0;
			if(map[key][2]) dArr[key]=!dArr[key];
		}
	}
	return dArr;
}

function parseAnalog(data, gpad, ofs) {
	const dArr=newDat(), map=gpad.map.analog, keys=Object.keys(map),
	sArr=gpad.msData, fArr=gpad.fData, sAmt=gpad.aSAmt, fAmt=gpad.aFAmt;
	for(let i=0,l=keys.length,key,dPos,val; i<l; i++) {
		key=keys[i]; if(typeof map[key] == "object") {
			dPos=map[key][0]+ofs; val=0; const bits=map[key][2]; let b=map[key][1];
			for(let o=0; o<bits; o++,b++) if(data[dPos+Math.floor(b/8)] & 1<<b%8) val += 1<<o;
			if(map[key][3]) val=val/map[key][3]*255;
		} else dPos=map[key]+ofs, val=data[dPos];
		if(sAmt) val=smooth(val,sArr[key],sAmt);
		if(fAmt && typeof fArr[key] == "number") { val=filter(val, fArr[key], fAmt); fArr[key]=val; }
		dArr[key]=val;
	}
	return dArr;
}

function parseMotion(data, gpad, ofs) {
	const dArr={}, map=gpad.map.motion, keys=Object.keys(map),
	bits=Math.abs(map['bits']), sign=map['bits'] < 0, uMax=1 << bits,
	sMax=uMax/2, bytes=Math.floor(bits / 8), mask=(1 << (bits % 8))-1;
	for(let i=0,l=keys.length,key,val,b,o; i<l; i++) {
		key=keys[i]; if(key == 'bits') continue; o=map[key]+ofs, val=0;
		for(b=0; b<bytes; b++) val += data[o++] << b*8;
		val += (data[o] & mask) << b*8;
		if(sign && val >= sMax) val=val-uMax;
		dArr[key]=val;
	}
	return dArr;
}

function parseStatus(data, gpad, ofs) {
	const dArr={}, map=gpad.map.status, keys=Object.keys(map);
	for(let i=0,l=keys.length,key,mCon; i<l; i++) {
		key=keys[i], mCon=map[key]; if(typeof mCon == "object") {
			let mDat=Object.assign({},mCon); delete mDat["index"];
			let dat=data[mCon["index"]+ofs],sKeys=Object.keys(mDat),mVal=obMax(mDat),lDst=mDat[mVal];
			for(let s=0,g=sKeys.length,sKey,sVal,dst; s<g; s++) {
				sKey=sKeys[s], sVal=mDat[sKey];
				if(typeof sVal == "number") { dst=mDat[sKey]-dat; if(dst>=0&&dst<lDst) dArr[key]=sKey,lDst=dst; }
				else if(parseStatusExp(sVal, data, ofs)) { dArr[key]=sKey; break; }
			} if(!dArr[key]) dArr[key]=mVal;
		} else dArr[key]=data[mCon+ofs];
	}
	return dArr;
}

function parseStatusExp(arr, dat, ofs) {
	let tExp=0; for(let i=0,l=arr.length,exp; i<l; i++) {
		exp=arr[i]; if(exp[2] ? dat[exp[0]+ofs]>=exp[1] : dat[exp[0]+ofs]<=exp[1]) tExp++;
	}
	return tExp==l;
}

function smooth(input, prevData, amt) {
	let sum=0; prevData.push(input);
	if(prevData.length > amt) prevData.shift();
	for(let i=0,l=prevData.length; i<l; i++) { sum += prevData[i]; }
	return Math.floor(sum / prevData.length);
}

function filter(input, prevVal, amt) {
	if(Math.abs(input - 127) <= amt) return 127;
	if(Math.abs(input - prevVal) > amt) return input;
	return prevVal;
}

function handle(data, prev, func) {
	const keys=Object.keys(data),u={}; for(let i=0,l=keys.length; i<l; i++) {
		if(data[keys[i]] != prev[keys[i]]) {
			prev[keys[i]]=data[keys[i]]; u[keys[i]]=true; if(func)func(keys[i],data[keys[i]]);
		}
	} return Object.keys(u).length?u:false;
}