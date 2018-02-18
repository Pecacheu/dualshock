#include <node.h>
#include <Windows.h>
#include <string>

#include "sbc/sbc.h"

//From Win32 Common:
#define SAFE_RELEASE(x) if(x) { x->Release(); x = NULL; }

using namespace v8;
using namespace std;

char *cstr(string str) {
	char *cstr = new char[str.length()+1];
	strcpy(cstr, str.c_str()); return cstr;
}

char *eCode(string name, DWORD hr) {
	LPSTR buf = nullptr; size_t size = FormatMessageA(FORMAT_MESSAGE_ALLOCATE_BUFFER | FORMAT_MESSAGE_FROM_SYSTEM |
	FORMAT_MESSAGE_IGNORE_INSERTS, NULL, hr, MAKELANGID(LANG_NEUTRAL, SUBLANG_DEFAULT), (LPSTR)&buf, 0, NULL);
	string msg(buf, size); LocalFree(buf); return cstr("Error in "+name+": "+msg);
}

void throwEx(Isolate *iso, char *msg) {
	iso->ThrowException(Exception::TypeError(String::NewFromUtf8(iso,msg)));
}

//----------------------------------------------------------------------------
//------ SBC Encode / Decode:
//----------------------------------------------------------------------------

/*char *aThreadErr = NULL;
UINT8 *aThreadBuf = NULL; UINT32 aBufLen = 0;
volatile bool aThreadRun = false, aThreadReady = false;

DWORD aThread(LPVOID par) {
	aThreadErr = readAudio(&aThreadBuf, &aBufLen);
	aThreadReady = true; return 0;
}

void runStream(const FunctionCallbackInfo<Value>& args) {
	Isolate *iso = args.GetIsolate();
	if(!pAudioClient) {
		REFERENCE_TIME btime = 500;
		if(args.Length() == 1 && args[0]->IsNumber() && args[0]->NumberValue() > 0) btime = args[0]->NumberValue();
		char *err = RecordAudioStream(btime*10000); if(err) { throwEx(iso,err); return; }
	}
	//Cancel if already running:
	if(aThreadRun) { args.GetReturnValue().Set(Boolean::New(iso,false)); return; }
	//Launch Audio Read thread:
	HANDLE ret = CreateThread(NULL, 0, aThread, NULL, 0, NULL);
	if(ret == NULL) { throwEx(iso,eCode("CreateThread",GetLastError())); return; }
	aThreadRun = true; args.GetReturnValue().Set(Boolean::New(iso,true));
}

void checkStream(const FunctionCallbackInfo<Value>& args) {
	Isolate *iso = args.GetIsolate(); if(!aThreadRun) return;
	if(!aThreadReady) { args.GetReturnValue().Set(Boolean::New(iso,false)); return; }
	if(aThreadErr) throwEx(iso,aThreadErr); else if(aThreadBuf) {
		//Convert to JavaScript Buffer:
		Local<ArrayBuffer> aBuf = ArrayBuffer::New(iso,aBufLen);
		Local<Uint8Array> nBuf = Uint8Array::New(aBuf,0,aBufLen);
		for(UINT32 i=0; i<aBufLen; i++) nBuf->Set(i,Number::New(iso,aThreadBuf[i]));
		args.GetReturnValue().Set(nBuf);
	}
	aThreadErr = NULL; delete[] aThreadBuf; aThreadBuf = NULL;
	aThreadRun = false; aThreadReady = false;
}*/

sbc_t sbc; bool sbcInit = false;
UINT8 *sbcIn, *sbcOut; UINT32 sbcLen = 0;

void sbcSet() {
	//if(sbcInit) sbc_reinit(*sbc,0); else { sbc_init(*sbc,0); sbcInit = true; }
	if(!sbcInit) { sbc_init(&sbc,0); sbcInit = true; }
	
	//sbc->flags = flags;
	sbc.frequency = SBC_FREQ_32000;
	sbc.mode = SBC_MODE_DUAL_CHANNEL;//JOINT_STEREO;
	sbc.subbands = SBC_SB_8;
	sbc.blocks = SBC_BLK_16;
	sbc.bitpool = 10;
	sbc.allocation = SBC_AM_SNR;
	sbc.endian = SBC_LE;
}

void sbcEncode(const FunctionCallbackInfo<Value>& args) {
	Isolate *iso = args.GetIsolate(); UINT8 ar = args.Length();
	
	//Get array:
	Local<TypedArray> arr;
	if(ar >= 1 && args[0]->IsTypedArray()) arr = Local<TypedArray>::Cast(args[0]);
	else if(ar >= 1 && args[0]->IsArrayBuffer()) {
		Local<ArrayBuffer> buf = Local<ArrayBuffer>::Cast(args[0]);
		arr = Uint8Array::New(buf,0,buf->ByteLength());
	} else { throwEx(iso,"Expected (Uint8Array or ArrayBuffer[, Number offset[, Number len]])"); return; }
	
	//Get length/offset:
	UINT32 ofs = 0, uLen = 0, aLen = arr->Length(), max = 0;
	if(ar >= 2 && args[1]->IsNumber()) {
		ofs = args[1]->NumberValue(); if(ofs < 0) { throwEx(iso,"Offset must be >= 0"); return; }
	}
	if(ar >= 3 && args[2]->IsNumber()) {
		uLen = args[2]->NumberValue(); if(uLen > aLen-ofs) uLen = aLen-ofs;
	}
	if(ar >= 4 && args[3]->IsNumber()) {
		max = args[3]->NumberValue(); if(max <= 0) { throwEx(iso,"Max Parse must be > 0"); return; }
	}
	
	//Get params:
	//TODO
	sbcSet();
	
	//Calc length:
	UINT32 len = (uLen?uLen:aLen-ofs);
	if(len <= 0) { throwEx(iso,"Length must be > 0"); return; }
	
	//Fill input buffer:
	if(sbcLen < len) { sbcIn = new UINT8[len]; sbcOut = new UINT8[len]; }
	for(UINT32 i=0; i<len; i++) sbcIn[i] = arr->Get(i+ofs)->NumberValue();
	
	UINT32 iPos = 0, oPos = 0; ssize_t used, size = 0;
	
	UINT32 f=0; while(iPos < len && (!max || ++f<=max)) {
		used = sbc_encode(&sbc, sbcIn+iPos, len-iPos, sbcOut+oPos, len-oPos, &size);
		if(used < 0) { throwEx(iso,cstr("Encode Error: "+to_string(used))); return; }
		if(used == 0) break; else { iPos += used; oPos += size; }
	}
	
	//Convert to JavaScript Buffer:
	Local<ArrayBuffer> aBuf = ArrayBuffer::New(iso,oPos);
	Local<Uint8Array> nBuf = Uint8Array::New(aBuf,0,oPos);
	nBuf->Set(String::NewFromUtf8(iso,"unparsed"),Number::New(iso,len-iPos));
	for(UINT32 i=0; i<oPos; i++) nBuf->Set(i,Number::New(iso,sbcOut[i]));
	args.GetReturnValue().Set(nBuf);
}

void sbcDecode(const FunctionCallbackInfo<Value>& args) {
	/*sbcSet();
	used = sbc_decode(&sbc, sbcIn+iPos, len-iPos, sbcOut+oPos, len-oPos, &size);*/
}

void init(Local<Object> exports) {
	NODE_SET_METHOD(exports, "sbcEncode", sbcEncode);
	NODE_SET_METHOD(exports, "sbcDecode", sbcDecode);
}

NODE_MODULE(sbc, init)