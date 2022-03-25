//Node DualShock Library, ©2022 Pecacheu. GNU GPL v3.0
import {crc32 as crc} from '../crc.js'; import {Resampler} from '../resampler.js';
import {createRequire} from 'module'; createRequire(import.meta.url)('../build/Release/sbc');

export function _init() {
	this.rPowL=0, this.rPowR=0, this.ledState=[0,0,0,0,0], this.vol=[0,0,0,0];
}

export function _parse(data,chg) {
	//Reset finger smoothing data on touchpad press:
	if(chg.t1 && this.digital.t1) this.msData.t1X=[], this.msData.t1Y=[];
	if(chg.t2 && this.digital.t2) this.msData.t2X=[], this.msData.t2Y=[];
}

export function _getMode(dev) {
	return dev.release==0?"bluetooth":"usb";
}

export function setLed(r, g, b, flashOn, flashOff) {
	let s=this.ledState;
	for(let i=0; i<5; i++) if(arguments[i] != null) s[i] = arguments[i]||0;
	ds4Write(this);
}

export function rumble(left, right) {
	this.rPowL=left||0, this.rPowR=right||0;
	ds4Write(this);
}

export function rumbleAdd(left, right) {
	if(left>0) this.rPowL=left; if(right>0) this.rPowR=right;
	ds4Write(this);
}

export function setVolume(left, right, mic, spk) {
	this.vol=[left||0,right||0,mic||0,spk||0];
	ds4Write(this);
}

let RESAMP_BUF=150000;
let rData, sData, resamp;

function initSound(ibl) {
	if(ibl) RESAMP_BUF=Math.floor(ibl/2)*2;
	sData=new Int16Array(RESAMP_BUF/2);
	resamp=new Resampler(44100, 32000, 2, sData);
}

export function sound(raw,ibl) {
	if(!sData) initSound(ibl); if(!raw || raw.length == 0) return;
	if(raw.length > RESAMP_BUF) throw "Data too long for buffer! "+raw.length;

	//Resample audio:
	raw.copy(Buffer.from(sData.buffer));
	const rSize=resamp.resampler(raw.length/2);

	//Convert output to buffer:
	let data=Buffer.from(resamp.outputBuffer.buffer,0,rSize*2);
	//console.log("RAW: "+(raw.length/2)+", RESAMPLED: "+(data.length/2));

	//Cobine leftover data with new data:
	/*if(rData) {
		const rl = rData.length, b = Buffer.allocUnsafe(rl+data.length);
		rData.copy(b); data.copy(b,rl); data = b; rData = null;
	}*/

	//Compress & send data in chunks:
	const dl=data.length; let o=0,l,s,u;
	while(1) {
		l=dl-o, s=sbc.sbcEncode(data.buffer,o,l), u=s.unparsed; //Encode to SBC
		console.log("-- SUB "+len+", ENC: "+s.length+", UNPARSED: "+unp);
		if(u) {
			if(l-u<0) { console.log(chalk.bgRed("WTF!?")); break; }
			if(s.length == 0) { //Save leftover data
				rData = Buffer.allocUnsafe(u); data.copy(rData,0,l-u); break;
			} else o+=l-u; //Continue parsing
		}
		//(l-u)/2
		console.log("-- SND "+s.length);
		ds4WriteSound(this,s,0x17); //Send data to DS4
		//writeSBCFrame(this,s);
		if(!u) break;
	}
}

/*let fb = [], fl = 0;
function writeSBCFrame(d,f) {
	fb.push(Buffer.from(f.buffer)); fl += f.length;
	if(fb.length == 4) {
		const b = new Buffer.allocUnsafe(fl);
		for(let i=0,l=fb.length,o=0; i<l; i++) { fb[i].copy(b,o); o += fb[i].length; }
		/*for(let i=0,l=fb.length,o=0,p1,p2; i<l; i++) for(let ii=0,ll=fb[i].length; ii<ll; ii+=2) {
			p1 = fb[i][ii]; p2 = fb[i][ii+1]; b[o++] = p1; b[o++] = p2; //b[o++] = p1; b[o++] = p2;
		}*
		//console.log("-- SND "+b.length);
		//const b2 = Buffer.from(b.buffer,fl/2);
		ds4WriteSound(d,b,0x17); //setTimeout(() => { ds4WriteSound(d,b2,0x17); },20);
		fb = [], fl = 0;
	}
}*/

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
		const msg = [
			0xa2, 0x11, 0xc0, 0xa0, 0xf3, 0x04, 0x00,//0x80, 0x00, 0x0f, 0x00, 0x00,
			dev.rPowR, //Rumble Power Right
			dev.rPowL, //Rumble Power Left
			dev.ledState[0], //LED Red
			dev.ledState[1], //LED Green
			dev.ledState[2], //LED Blue
			dev.ledState[3], //LED Flash On
			dev.ledState[4], //LED Flash Off
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			dev.vol[0], dev.vol[1], dev.vol[2], dev.vol[3], 0x85, //Volumes
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
			0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
		], crc32=crc(msg);
		msg[75]=crc32[0]; msg[76]=crc32[1];
		msg[77]=crc32[2]; msg[78]=crc32[3];
		msg.shift(); //Remove 0xa2 at start.
		dev.write(msg); //TODO: Won't work due to not using hid_write_control!
	}
}

let c=true; const msgMin=526;
function copyTo(b,a,o) { if(!o) o=0; for(let i=0,l=a.length; i<l; i++) b[o++]=a[i]; }

function ds4WriteSound(dev, data, code) {
	const dl=6+data.length, msg=new Array(Math.max(dl,msgMin));
	copyTo(msg,[code,0x40,0xa0,0,0,c=(c?0:1)]); copyTo(msg,data,6);
	if(dl < msgMin) msg.fill(0,dl,msgMin); dev.write(msg); //TODO: Won't work due to not using hid_write_control!
}