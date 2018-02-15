//This work is licensed under a GNU General Public License, v3.0. Visit http://gnu.org/licenses/gpl-3.0-standalone.html for details.
//DualShock Library Demo, Copyright (©) 2017 Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com)

const chalk = require('chalk'), ds = require('..');

const debug = false;

var nLedVal = 0;
begin();

//Main Program:
function begin() {
	waitForExit();
	
	//Get list of devices. Accepts optional string to filter by type.
	var list = ds.getDevices();
	
	console.log(chalk.green("Devices:"),list);
	if(list.length < 1) { console.log(chalk.red("Could not find a controller!")); process.exit(); }
	
	//Get gamepad's device object:
	var device = list[0];
	
	//Open device, return gamepad object:
	var gamepad = ds.open(device, {smoothAnalog:10, smoothMotion:15, joyDeadband:4, moveDeadband:4});
	
	//If you want to react to button presses to trigger rumble and led functions, you can do so like this:
	
	/*gamepad.ondigital = function(button, value) {
		//console.log("BUTTON '"+button+"' = "+value);
		rumbleScript(button, value, 'd', this);
	}
	gamepad.onanalog = function(axis, value) {
		//console.log("ANALOG '"+axis+"' = "+value);
		rumbleScript(axis, value, 'a', this);
	}
	function rumbleScript(axis, val, call, g) {
		//Rumble On:
		if(call == 'a' && (axis == 'l2' || axis == 'r2') && (g.analog.l2 || g.analog.r2))
		{ g.rumble(g.analog.l2, g.analog.r2>0); console.log("rumble set", [g.analog.l2,(g.analog.r2>0)?255:0]); }
		else if(call == 'd' && axis == 'l3' && val) { g.rumbleAdd(94, 0, 255, 0); console.log("rumble slow"); }
		else if(call == 'd' && axis == 'start' && val) { g.rumbleAdd(0, 255, 0, 5); console.log("rumble tap"); }
		//Rumble Off:
		else if((call == 'a' && (axis == 'l2' || axis == 'r2') || call == 'd' && (axis == 'l3' || axis == 'start')) &&
		!(g.analog.l2 || g.analog.r2 || g.digital.l3 || g.digital.start)) { g.rumble(0, 0); console.log("rumble off"); }
		//Change LED Pattern:
		else if(call == 'd' && axis == 'ps' && val) { g.setLed(nLedVal); console.log("led set "+nLedVal); nLedVal++; if(nLedVal > 15) nLedVal = 0; }
	}*/
	
	//A little complicated, right? Plus, it's not very reliable. Theoretically, gamepad.analog.l2 should reflect the
	//current value of the l2 trigger. But to absolutly minimize lag, callbacks are called before the parsing of all data
	//is finished, so sometimes analog data parsing is not finished yet, meaning the value you get isn't up to date!
	
	//Fortunatly there's a better way! We can use gamepad.onupdate instead.
	//gamepad.onupdate is called ONLY ONCE every frame update, versus onanalog and ondigital which are called
	//many times each frame depending on how many inputs changed from the last frame. onupdate function only has one
	//parameter, 'changed', which is an object containing names of any inputs that changed from the last frame in this format:
	//EX. {l2:true, cross:true, select:true, lStickX:true} Notice how all values are true, even analog ones? The value of items
	//doesn't actually matter. The important thing is that they're present.
	
	//You might think that changed object would be better as an array, but then you'd have to rummage around the array
	//searching for an element with the desiered value, but with the object approch you can just check like if(changed.ps) for example.
	
	//NOTE: even onupdate won't be able to properly read motion or status data (through gamepad.motion and gamepad.status objects)
	//unless a listener (or simply 'true') is assigned to onmotion or onstatus callbacks, respectively. This is because when
	//onmotion and onstatus are not present, motion and status data is not parsed at all to save resources.
	
	gamepad.onmotion = true;
	gamepad.onstatus = true;
	
	//DS4 Only: Random LED Stuffs:
	/*setInterval(function() {
		gamepad.setLed(Math.floor(Math.random()*255),Math.floor(Math.random()*255),Math.floor(Math.random()*255));
	}, 100);*/
	
	gamepad.onupdate = function(changed) {
		rumbleScript(changed, this);
		//Uncomment one of these lines for debugging!
		//console.log(this.digital);
		//console.log(this.analog);
		//console.log(this.motion,this.status);
	}
	
	function rumbleScript(chg, g) {
		//Rumble On:
		if(chg.l2 || chg.r2) { g.rumbleAdd(g.analog.l2?g.analog.l2:-1, g.analog.r2?255:-1, 254, 254); console.log("rumble set", [g.analog.l2,(g.analog.r2>0)?255:0]); }
		else if(chg.l3 && g.digital.l3) { g.rumbleAdd(94, 0, 255, 0); console.log("rumble slow"); }
		else if(chg.start && g.digital.start) { g.rumbleAdd(0, 255, 0, 5); console.log("rumble tap"); }
		//Rumble Off:
		if((chg.l2 || chg.r2 || chg.l3 || chg.start) && !(g.analog.l2 || g.analog.r2 || g.digital.l3 || g.digital.start)) { g.rumble(0, 0); console.log("rumble off"); }
		//Change LED Pattern:
		if(chg.ps && g.digital.ps) { g.setLed(nLedVal); console.log("led set "+nLedVal); nLedVal++; if(nLedVal > 15) nLedVal = 0; }
	}
	
	//See how much easier this is with onupdate?
	//Some apps work well with ondigital & onanalog, while others work better using onupdate.
	//While we're at it, we also changed that first rumble to a rumbleAdd. (So it wont cancel any current rumbles already going on)
	//Setting a value to -1 in rumbleAdd overrides to 0 for that value, otherwise setting to 0 would not override any current value.
	
	//If gamepad is disconnected, exit application:
	gamepad.ondisconnect = function() {
		console.log(chalk.red(this.type.toUpperCase()+" disconnected!"));
		process.exit();
	}
	
	//If any error happens, log it and exit:
	gamepad.onerror = function(error) {
		console.log(chalk.red(error));
		process.exit();
	}
}

//Allows you to quit by typing exit:
function waitForExit() {
	process.stdin.resume();
	process.stdin.setEncoding('utf8');
	process.stdin.on('data', function(text) {
		while(text.search('\n') != -1) text = text.substring(0, text.search('\n'));
		while(text.search('\r') != -1) text = text.substring(0, text.search('\r'));
		if(text == "exit" || text == "quit") {
			console.log(chalk.magenta("Exiting..."));
			process.exit();
		}
	});
}