//Node.js Auto Loader v3.1, created by Bryce Peterson (Nickname: Pecacheu, Email: Pecacheu@gmail.com). Copyright 2016, All rights reserved.

var os = require('os'),
fs = require('fs'),
dns = require('dns'),
http = require('http'),
spawn = require('child_process').spawn;
var sysOS, sysArch, sysCPU; getOS();

//------------------------------------ CONFIGURATION OPTIONS ------------------------------------

var debug = false; //<- Debug Mode Enable
var deleteDir = false; //<- Delete Entire Module Directory and Reinstall if Incomplete
var autoInstallOptionals = true; //<- Also Install Optional Packages During Required Package Installation
var npmInstallNames = ["dualshock", "chalk"]; //<- Dependencies List
var optionalInstall = []; //<- Optional Dependencies (That's an oxymoron)
var externalFiles = []; //Optional Site Resources (Placed under pages/resources)
var pathResolves = {}; //Optional Sub-paths for Select File Types:

//------------------------------------ END OF CONFIG OPTIONS ------------------------------------

var ipList = getLocalIPList();
console.log("\nIP Address List:",ipList,"\nOperating System: "+sysOS+", "+sysArch);
if(debug) console.log("CPU: "+sysCPU+"\n\nWarning, Debug Mode Enabled.");
console.log("\nChecking for Dependencies...");

if(verifyDepends()) {
	//------------------------------------------ MAIN CODE ------------------------------------------
	var chalk = require('chalk');
	console.log(chalk.gray("All Dependencies Found!\n"));
	
	var main = require("./main");
	
	main.debug(debug); main.begin();
	//-------------------------------------- END OF MAIN CODE ---------------------------------------
} else {
	console.log("Dependencies Missing!\n");
	runJSLoader();
}

//Auto Installer Functions:

function verifyDepends() {
	var pathsExist = true;
	//Node.js Modules:
	for(var n=0,l=npmInstallNames.length; n<l; n++) {
		if(!fs.existsSync(__dirname+"/node_modules/"+npmInstallNames[n])) { pathsExist = false; break; }
	}
	//Internal HTML Client Files:
	for(n=0,l=externalFiles.length; n<l; n++) {
		var fileName = externalFiles[n].substring(externalFiles[n].lastIndexOf('/')+1);
		if(!fs.existsSync(determinePath(fileName)+fileName)) { pathsExist = false; break; }
	}
	return pathsExist;
}

function runJSLoader() {
	console.log("Starting Installer..."); console.log();
	checkInternet(function(res) {
		if(res) {
			if(externalFiles.length) {
				createNewFolder(__dirname+"/pages/resources/");
				console.log("Downloading JavaScript Libraries..."); var i = 0;
				var fileName = externalFiles[i].substring(externalFiles[i].lastIndexOf('/')+1);
				if(!folderExists(determinePath(fileName))) createNewFolder(determinePath(fileName));
				var file = fs.createWriteStream(determinePath(fileName)+fileName);
				function response(resp) {
					fileName = externalFiles[i].substring(externalFiles[i].lastIndexOf('/')+1);
					if(!folderExists(determinePath(fileName))) createNewFolder(determinePath(fileName));
					file = fs.createWriteStream(determinePath(fileName)+fileName);
					resp.pipe(file); file.on('finish', function() {
						console.log("Downloaded '"+fileName+"'");
						i++; if(i >= externalFiles.length) { console.log(); doInstall(); }
						else http.get(externalFiles[i], response);
					});
				}
				http.get(externalFiles[i], response);
			} else doInstall();
		} else {
			console.log("Error: No Internet Connection Detected!");
			console.log(); process.exit();
		}
	});
}

function determinePath(filename) {
	var ext = filename.substring(filename.lastIndexOf('.')), pathRes;
	pathRes = "/pages"+(pathResolves[ext] || "/resources/");
	if(debug) console.log("ext '"+ext+"' resolves '"+pathRes+"'");
	return __dirname+pathRes;
}

function folderExists(folder) {
	return fs.existsSync(folder) && fs.lstatSync(folder).isDirectory();
}

function doInstall() {
	if(deleteDir) { console.log("Emptying Install Directory...\n"); deleteFolder(__dirname+"/node_modules/"); }
	console.log("Installing Node.js Modules...");
	if(autoInstallOptionals) npmInstallNames = npmInstallNames.concat(optionalInstall);
	var i = 0; runinternal();
	function runinternal() {
		if(i >= npmInstallNames.length) { deleteFolder(__dirname+"/etc"); console.log("Installer Finished. Exiting...\n"); process.exit(); }
		else if(deleteDir || !fs.existsSync(__dirname+"/node_modules/"+npmInstallNames[i])) {
			var module = npmInstallNames[i]; i++;
			console.log("Installing NPM Module: "+module+"\n");
			
			var args = ["install", module, "--prefix", __dirname];
			var cmd = spawn(sysOS == "Windows" ? "npm.cmd" : "npm", args);
			cmd.stdout.pipe(process.stdout); cmd.stderr.pipe(process.stdout);
			
			cmd.on('close', function(code) {
				console.log("Module '"+module+"' Installed.\n");
				runinternal();
			});
		} else {
			var module = npmInstallNames[i]; i++;
			console.log("Skipping '"+module+"' Module.\n");
			runinternal();
		}
	}
}

function createNewFolder(path) {
	if(fs.existsSync(path)) deleteFolder(path);
	fs.mkdirSync(path);
}

function deleteFolder(path) {
	if(fs.existsSync(path)) { //If path exists:
		var fileList = fs.readdirSync(path);
		for(var t=0,l=fileList.length; t<l; t++) { 
			var currPath = path+"/"+fileList[t];
			if(fs.lstatSync(currPath).isDirectory()) { //If directory, recurse:
				if(debug) console.log("-- open dir "+fileList[t]);
				deleteFolder(currPath);
			} else { //If file, delete it:
				if(debug) console.log("delete "+fileList[t]);
				fs.unlinkSync(currPath);
			}
		}
		if(debug) console.log("-- remove dir");
		fs.rmdirSync(path);
	}
}

function checkInternet(callback) {
	dns.resolve("www.google.com", function(err) { callback(!err); });
}

function getLocalIPList() {
	var netList = [], ifaceList = os.networkInterfaces();
	if(typeof ifaceList == "object") {
		var ifaceListKeys = Object.keys(ifaceList);
		for(var i=0,l=ifaceListKeys.length; i<l; i++) {
			var iface = ifaceList[ifaceListKeys[i]];
			if(typeof iface == "object") {
				var ifaceKeys = Object.keys(iface);
				for(var j=0,n=ifaceKeys.length; j<n; j++) {
					var ifItm = iface[ifaceKeys[j]];
					if(ifItm.internal == false && ifItm.family == "IPv4" && ifItm.mac != "00:00:00:00:00:00") {
						if(ifItm.address) netList.push(ifItm.address);
					}
				}
			}
		}
	}
	return netList.length ? netList : false;
}

function getOS() {
	switch(os.platform()) {
		case "win32": sysOS = "Windows"; break;
		case "darwin": sysOS = "Macintosh OS"; break;
		case "linux": sysOS = "Linux"; break;
		default: sysOS = os.platform();
	}
	switch(os.arch()) {
		case "ia32": sysArch = "32-bit"; break;
		case "x64": sysArch = "64-bit"; break;
		case "arm": sysArch = "ARM"; break;
		default: sysArch = os.arch();
	}
	sysCPU = os.cpus()[0].model;
}