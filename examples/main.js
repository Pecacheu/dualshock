//DualShock Library Demo:

var chalk = require('chalk'),
ds = require('dualshock');

var debug = false;

//Main Program:
function begin() {
	waitForExit(); var device = ds.getDevices("ds3")[0];
	if(!device) { console.log(chalk.red("Could not find a DualShock controller!")); process.exit(); }
	
	//Open gamepad device, return open gamepad:
	var gamepad = ds.open(device, {smoothAnalog:10, smoothMotion:15, joyDeadband:4, moveDeadband:4});
	
	//If you want to react to button presses to trigger rumble and led functions, you can do so like this:
	
	var nLedVal = 0;
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
		if(call == 'a' && (axis == 'l1' || axis == 'r1') && (g.analog.l1 || g.analog.r1))
		{ g.rumble(g.analog.l1, g.analog.r1>0); console.log("rumble set", [g.analog.l1,(g.analog.r1>0)?255:0]); }
		else if(call == 'd' && axis == 'l3' && val) { g.rumbleAdd(94, 0, 255, 0); console.log("rumble slow"); }
		else if(call == 'd' && axis == 'start' && val) { g.rumbleAdd(0, 255, 0, 5); console.log("rumble tap"); }
		//Rumble Off:
		else if((call == 'a' && (axis == 'l1' || axis == 'r1') || call == 'd' && (axis == 'l3' || axis == 'start')) &&
		!(g.analog.l1 || g.analog.r1 || g.digital.l3 || g.digital.start)) { g.rumble(0, 0); console.log("rumble off"); }
		//Change LED Pattern:
		else if(call == 'd' && axis == 'ps' && val) { g.setLed(nLedVal); console.log("led set "+nLedVal); nLedVal++; if(nLedVal > 15) nLedVal = 0; }
	}*/
	
	//A little complicated, right? Plus, it's not very reliable. Theoretically, gamepad.analog.l1 should reflect the
	//current value of the L1 trigger. But to absolutly minimize lag, callbacks are called before the parsing of all data
	//is finished, so sometimes analog data parsing is not finished yet, meaning the value you get isn't up to date!
	
	//Fortunatly there's a better way! We can use gamepad.onupdate instead.
	//gamepad.onupdate is called ONLY ONCE every frame update, versus onanalog and ondigital which are called
	//many times each frame depending on how many inputs changed from the last frame. onupdate function only has one
	//parameter, 'changed', which is an object containing names of any inputs that changed from the last frame in this format:
	//EX. {l1:true, cross:true, select:true, lStickX:true} Notice how all values are true, even analog ones? The value of items
	//doesn't actually matter. The important thing is that they're present.
	
	//You might think that changed object would be better as an array, but then you'd have to rummage around the array
	//searching for an element with the desiered value, but with the object approch you can just check like if(changed.ps) for example.
	
	//NOTE: even onupdate won't be able to properly read motion or status data (through gamepad.motion and gamepad.status objects) unless
	//at the very least an empty function is assigned to onmotion or onstatus callbacks, respectively. This is because if onmotion and
	//onstatus are not present, motion and status data is not parsed at all to save resources.
	
	gamepad.onupdate = function(changed) {
		rumbleScript(changed, this);
	}
	function rumbleScript(chg, g) {
		//Rumble On:
		if(chg.l1 || chg.r1) { g.rumbleAdd(g.analog.l1?g.analog.l1:-1, g.analog.r1?255:-1, 254, 254); console.log("rumble set", [g.analog.l1,(g.analog.r1>0)?255:0]); }
		else if(chg.l3 && g.digital.l3) { g.rumbleAdd(94, 0, 255, 0); console.log("rumble slow"); }
		else if(chg.start && g.digital.start) { g.rumbleAdd(0, 255, 0, 5); console.log("rumble tap"); }
		//Rumble Off:
		if((chg.l1 || chg.r1 || chg.l3 || chg.start) && !(g.analog.l1 || g.analog.r1 || g.digital.l3 || g.digital.start)) { g.rumble(0, 0); console.log("rumble off"); }
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

//Export stuff for AutoLoader:
exports.begin = begin;
exports.debug = function(db) { debug = db; }