//Code by Shubshub @ https://pastebin.com/KiazwqCu
function CrcModel(width, name, polynomial, initial, finalXor, inputReflected, resultReflected) {
	this.width = width;
	this.name = name;
	this.polynomial = polynomial;
	this.initial = initial;
	this.finalXor = finalXor;
	this.inputReflected = inputReflected;
	this.resultReflected = resultReflected;
}

/* Known CRC algorihtms */
var CrcDatabase = [
	new CrcModel(8, "CRC8", 0x07, 0x00, 0x00, false, false),
	new CrcModel(8, "CRC8_SAE_J1850", 0x1D, 0xFF, 0xFF, false, false),
	new CrcModel(8, "CRC8_SAE_J1850_ZERO", 0x1D, 0x00, 0x00, false, false),
	new CrcModel(8, "CRC8_8H2F", 0x2F, 0xFF, 0xFF, false, false),
	new CrcModel(8, "CRC8_CDMA2000", 0x9B, 0xFF, 0x00, false, false),
	new CrcModel(8, "CRC8_DARC", 0x39, 0x00, 0x00, true, true),
	new CrcModel(8, "CRC8_DVB_S2", 0xD5, 0x00, 0x00, false, false),
	new CrcModel(8, "CRC8_EBU", 0x1D, 0xFF, 0x00, true, true),
	new CrcModel(8, "CRC8_ICODE", 0x1D, 0xFD, 0x00, false, false),
	new CrcModel(8, "CRC8_ITU", 0x07, 0x00, 0x55, false, false),
	new CrcModel(8, "CRC8_MAXIM", 0x31, 0x00, 0x00, true, true),
	new CrcModel(8, "CRC8_ROHC", 0x07, 0xFF, 0x00, true, true),
	new CrcModel(8, "CRC8_WCDMA", 0x9B, 0x00, 0x00, true, true),

	new CrcModel(16, "CRC16_CCIT_ZERO", 0x1021, 0x0000, 0x0000, false, false),
	new CrcModel(16, "CRC16_ARC", 0x8005, 0x0000, 0x0000, true, true),
	new CrcModel(16, "CRC16_AUG_CCITT", 0x1021, 0x1D0F, 0x0000, false, false),
	new CrcModel(16, "CRC16_BUYPASS", 0x8005, 0x0000, 0x0000, false, false),
	new CrcModel(16, "CRC16_CCITT_FALSE", 0x1021, 0xFFFF, 0x0000, false, false),
	new CrcModel(16, "CRC16_CDMA2000", 0xC867, 0xFFFF, 0x0000, false, false),
	new CrcModel(16, "CRC16_DDS_110", 0x8005, 0x800D, 0x0000, false, false),
	new CrcModel(16, "CRC16_DECT_R", 0x0589, 0x0000, 0x0001, false, false),
	new CrcModel(16, "CRC16_DECT_X", 0x0589, 0x0000, 0x0000, false, false),
	new CrcModel(16, "CRC16_DNP", 0x3D65, 0x0000, 0xFFFF, true, true),
	new CrcModel(16, "CRC16_EN_13757", 0x3D65, 0x0000, 0xFFFF, false, false),
	new CrcModel(16, "CRC16_GENIBUS", 0x1021, 0xFFFF, 0xFFFF, false, false),
	new CrcModel(16, "CRC16_MAXIM", 0x8005, 0x0000, 0xFFFF, true, true),
	new CrcModel(16, "CRC16_MCRF4XX", 0x1021, 0xFFFF, 0x0000, true, true),
	new CrcModel(16, "CRC16_RIELLO", 0x1021, 0xB2AA, 0x0000, true, true),
	new CrcModel(16, "CRC16_T10_DIF", 0x8BB7, 0x0000, 0x0000, false, false),
	new CrcModel(16, "CRC16_TELEDISK", 0xA097, 0x0000, 0x0000, false, false),
	new CrcModel(16, "CRC16_TMS37157", 0x1021, 0x89EC, 0x0000, true, true),
	new CrcModel(16, "CRC16_USB", 0x8005, 0xFFFF, 0xFFFF, true, true),
	new CrcModel(16, "CRC16_A", 0x1021, 0xC6C6, 0x0000, true, true),
	new CrcModel(16, "CRC16_KERMIT", 0x1021, 0x0000, 0x0000, true, true),
	new CrcModel(16, "CRC16_MODBUS", 0x8005, 0xFFFF, 0x0000, true, true),
	new CrcModel(16, "CRC16_X_25", 0x1021, 0xFFFF, 0xFFFF, true, true),
	new CrcModel(16, "CRC16_XMODEM", 0x1021, 0x0000, 0x0000, false, false),

	new CrcModel(32, "CRC32", 0x04C11DB7, 0xFFFFFFFF, 0xFFFFFFFF, true, true),
	new CrcModel(32, "CRC32_BZIP2", 0x04C11DB7, 0xFFFFFFFF, 0xFFFFFFFF, false, false),
	new CrcModel(32, "CRC32_C", 0x1EDC6F41, 0xFFFFFFFF, 0xFFFFFFFF, true, true),
	new CrcModel(32, "CRC32_D", 0xA833982B, 0xFFFFFFFF, 0xFFFFFFFF, true, true),
	new CrcModel(32, "CRC32_MPEG2", 0x04C11DB7, 0xFFFFFFFF, 0x00000000, false, false),
	new CrcModel(32, "CRC32_POSIX", 0x04C11DB7, 0x00000000, 0xFFFFFFFF, false, false),
	new CrcModel(32, "CRC32_Q", 0x814141AB, 0x00000000, 0x00000000, false, false),
	new CrcModel(32, "CRC32_JAMCRC", 0x04C11DB7, 0xFFFFFFFF, 0x00000000, true, true),
	new CrcModel(32, "CRC32_XFER", 0x000000AF, 0x00000000, 0x00000000, false, false)
];

/* two constructors supported:
    - new Crc(width, polynomial, initialVal, finalXorVal, inputReflected, resultReflected)
    - new Crc(width, crcModel)
*/
var Crc = function(width, polynomial, initialVal, finalXorVal, inputReflected, resultReflected) {
	/* private variables */
	// crc model variables
	var width;
	var polynomial;
	var initialVal;
	var finalXorVal;
	var inputReflected;
	var resultReflected;

	var crcTable; // lookup table
	var castMask;
	var msbMask;

	/* 'constructor' */
	if (arguments.length == 2 && typeof arguments[1] === "object") {
		width = arguments[0];
		polynomial = arguments[1].polynomial;
		initialVal = arguments[1].initial;
		finalXorVal = arguments[1].finalXor;
		inputReflected = arguments[1].inputReflected;
		resultReflected = arguments[1].resultReflected;
	} else if (arguments.length == 6) {
		width = arguments[0];
		polynomial = arguments[1];
		initialVal = arguments[2];
		finalXorVal = arguments[3];
		inputReflected = arguments[4];
		resultReflected = arguments[5];
	} else {
		new Error("Invalid arguments");
	}

	switch (width) {
		case 8:
			castMask = 0xFF;
			break;
		case 16:
			castMask = 0xFFFF;
			break;
		case 32:
			castMask = 0xFFFFFFFF;
			break;
		default:
			throw "Invalid CRC width";
			break;
	}
	msbMask = 0x01 << (width - 1)
	/* 'constructor' END */

	this.calcCrcTable = function() {
		crcTable = new Array(256);

		for (var divident = 0; divident < 256; divident++) {
			var currByte = (divident << (width - 8)) & castMask;
			for (var bit = 0; bit < 8; bit++) {
				if ((currByte & msbMask) != 0) {
					currByte <<= 1;
					currByte ^= polynomial;
				} else {
					currByte <<= 1;
				}
			}
			crcTable[divident] = (currByte & castMask);
		}
	}

	this.calcCrcTableReversed = function() {
		crcTable = new Array(256);

		for (var divident = 0; divident < 256; divident++) {
			var reflectedDivident = new CrcUtil().Reflect8(divident);

			var currByte = (reflectedDivident << (width - 8)) & castMask;

			for (var bit = 0; bit < 8; bit++) {
				if ((currByte & msbMask) != 0) {
					currByte <<= 1;
					currByte ^= polynomial;
				} else {
					currByte <<= 1;
				}
			}

			currByte = new CrcUtil().ReflectGeneric(currByte, width);

			crcTable[divident] = (currByte & castMask);
		}
	}

	if (!this.crcTable) {
		this.calcCrcTable();
	}

	this.compute = function(bytes) {
		var crc = initialVal;
		for (var i = 0; i < bytes.length; i++) {

			var curByte = bytes[i] & 0xFF;

			if (inputReflected) {
				curByte = new CrcUtil().Reflect8(curByte);
			}

			/* update the MSB of crc value with next input byte */
			crc = (crc ^ (curByte << (width - 8))) & castMask;
			/* this MSB byte value is the index into the lookup table */
			var pos = (crc >> (width - 8)) & 0xFF;
			/* shift out this index */
			crc = (crc << 8) & castMask;
			/* XOR-in remainder from lookup table using the calculated index */
			crc = (crc ^ crcTable[pos]) & castMask;
		}

		if (resultReflected) {
			crc = new CrcUtil().ReflectGeneric(crc, width);
		}
		return ((crc ^ finalXorVal) & castMask);
	}

	this.getLookupTable = function() {
		return crcTable;
	}
};

/*
 * String utility functions
 */
var StringUtil = function() {
	if (StringUtil.prototype._singletonInstance) {
		return StringUtil.prototype._singletonInstance;
	}
	StringUtil.prototype._singletonInstance = this;

	/*
	 * Converts a string into an array of bytes.
	 * This is not really correct as an character (unicode!) does not always fit into a byte, so the
	 * character value might be cut!
	 */
	this.getCharacterByteArrayFromString = function(str) {
		var i, charVal;
		var bytes = [];
		for (i = 0; i < str.length; i++) {
			charVal = str.charCodeAt(i);
			if (charVal < 256) {
				bytes[i] = str.charCodeAt(i);
			}
		}
		return bytes;
	};

	/*
	 * Get the given number as hexadecimal string
	 */
	this.getNumberAsHexStr = function(num) {
		var tempStr = num.toString(16).toUpperCase();
		return ("0x" + tempStr);
	}

	this.getNumberAsHexStr = function(num, widthInBits) {
		var tempStr = num.toString(16).toUpperCase();
		while (tempStr.length < (widthInBits >> 2)) {
			tempStr = '0' + tempStr;
		}
		return ("0x" + tempStr);
	}

	/*
	 * Get the given 32bit number as hexadecimal string
	 */
	this.getNumberAsHexStr32 = function(num) {
		var valueHigh = num >>> 16;
		var valueLow = num & 0x0000FFFF;
		return ("0x" + valueHigh.toString(16).toUpperCase() + valueLow.toString(16).toUpperCase());
	}

	this.getNumberAsHexStr32FixedWidth = function(num) {
		var valueHigh = num >>> 16;
		valueHigh = valueHigh.toString(16).toUpperCase()
		while (valueHigh.length < 4) {
			valueHigh = '0' + valueHigh;
		}

		var valueLow = num & 0x0000FFFF;
		valueLow = valueLow.toString(16).toUpperCase()
		while (valueLow.length < 4) {
			valueLow = '0' + valueLow;
		}

		return ("0x" + valueHigh + valueLow);
	}

	var lastErrToken;
	/*
	 * Get value of token where a call to getCharacterByteArrayFromByteString might have failed. */
	this.getLastErrorToken = function() {
		return lastErrToken;
	}

	/*
	 * Converts a string of byte values into an array of bytes.
	 * Returns undefined if an errors occurs. The erroneous token can be retrieved by getLastErrorToken().
	 */
	this.getCharacterByteArrayFromByteString = function(str) {
		var bytes = [];
		var bytePos = 0;
		var splitStr = str.split(/\s+/);
		for (var i = 0; i < splitStr.length; i++) {
			var byteStr = splitStr[i];
			if (byteStr.substr(0, 2) === "0x") {
				byteStr = byteStr.substr(2, byteStr.length - 2);
			}

			if (byteStr === " " || byteStr === "")
				continue;

			var b = parseInt(byteStr, 16);
			if (b === NaN || b === undefined) {
				lastErrToken = byteStr;
				return undefined;
			} else {
				if (b < 256) {
					bytes[bytePos] = b;
					bytePos++;
				} else {
					lastErrToken = byteStr;
					return undefined;
				}

			}
		}
		return bytes;
	}

};

/*
 * CRC utility functions to reflect numbers.
 */
var CrcUtil = function() {
	/* singleton */
	if (CrcUtil.prototype._singletonInstance) {
		return CrcUtil.prototype._singletonInstance;
	}
	CrcUtil.prototype._singletonInstance = this;

	this.Reflect8 = function(val) {
		var resByte = 0;

		for (var i = 0; i < 8; i++) {
			if ((val & (1 << i)) != 0) {
				resByte |= ((1 << (7 - i)) & 0xFF);
			}
		}

		return resByte;
	}

	this.Reflect16 = function(val) {
		var resByte = 0;

		for (var i = 0; i < 16; i++) {
			if ((val & (1 << i)) != 0) {
				resByte |= ((1 << (15 - i)) & 0xFFFF);
			}
		}

		return resByte;
	}

	this.Reflect32 = function(val) {
		var resByte = 0;

		for (var i = 0; i < 32; i++) {
			if ((val & (1 << i)) != 0) {
				resByte |= ((1 << (31 - i)) & 0xFFFFFFFF);
			}
		}

		return resByte;
	}

	this.ReflectGeneric = function(val, width) {
		var resByte = 0;

		for (var i = 0; i < width; i++) {
			if ((val & (1 << i)) != 0) {
				resByte |= (1 << ((width - 1) - i));
			}
		}

		return resByte;
	}
};

export function crc32(bytes) {
	var crc = new Crc(32, 0x04C11DB7, 0xFFFFFFFF, 0xFFFFFFFF, true, true);
	var crcValue = crc.compute(bytes);
	return new Uint8Array((new Int32Array([crcValue])).buffer);
}