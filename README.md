# DualShock Library

### Now Supports:
- DS4 led/rumble/trackpad even over bluetooth!
- DS4 internal speaker & headphone/headset jack!

###  Documentation & Code Examples Coming Soon.
######  For now, here's a quick summary:
Install with `npm install dualshock@3.1.1 --global-style`, then include with `ds = require('dualshock')`

####  Important Library Functions:
- **ds.getDevices(type)** returns list of devices with given type
- **ds.open(device, options={})** opens device and returns gamepad object
- **ds.getType(gamepadOrDevice)** returns gamepad type string (like "ds3" or "ds4")
- **ds.getFeatures(gamepad)** returns list of special features (like "charge" or "rumble")

####  Important Gamepad Properties:
- **gamepad.ondigital** callback to trigger when digital button is pressed
- **gamepad.onanalog** callback when analog axis (or button) value is changed
- **gamepad.onmotion** callback when controller motion is detected
- **gamepad.onstatus** callback when battery level or other status information changes
- **gamepad.setLed(state)** set controller leds. function is undefined if not supported. DS4 takes (r, g, b) instead
- **gamepad.setLed(one, two, three, four)** alt set controller leds
- **gamepad.rumble(left, right, durL, durR)** make controller rumble. function is undefined if not supported
- **gamepad.rumbleAdd(left, right, durL, durR)** add power or duration to current rumble
- **gamepad.type** same as `ds.getType(gamepad)`, but shorter
- **gamepad.setVolume(left, right, mic, spk)** set volume of DS4
- **gamepad.sound(data)** write sound to DS4. use int16 44100Hz audio. Will be converted to 32000Hz and compressed.

NOTE: `gamepad.sound` can take an optional second parameter that determines the maximum buffer size when the function is called for the first time.

All callback functions follow the format `function(buttonOrAxis, value)`

#### Examples:
To use the example program, cd to the examples folder and run the command `node test`.
You'll need to install the npm module `chalk`.