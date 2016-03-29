# DualShock Library
###  Documentation & Code Examples Coming Soon...

######  For now, here's a quick summary:
Install with `npm install dualshock`, then include with `ds = require('dualshock')`

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
- **gamepad.setLed(state)** set controller leds. function is undefined if not supported
- **gamepad.setLed(one, two, three, four)** set controller leds
- **gamepad.rumble(left, right, durL, durR)** make controller rumble. function is undefined if not supported
- **gamepad.rumbleAdd(left, right, durL, durR)** add power or duration to current rumble
- **gamepad.type** same as `ds.getType(gamepad)`, but shorter

All callback functions follow the format `function(buttonOrAxis, value)`