var ws281x = require('rpi-ws281x-native');
var express = require('express');
const defaultBrightness = 10;
const redColor = rgb2Int(255,0,0);
var ledIdInit = 0;
var initTimes = 4 * 8;
var app = express();


console.log("Listening on port 8083")
app.listen(8083);

var NUM_LEDS = parseInt(process.argv[2], 10) || 8,
    pixelData = new Uint32Array(NUM_LEDS);

ws281x.init(NUM_LEDS);

// ---- trap the SIGINT and reset before exit
process.on('SIGINT', function () {
  ws281x.reset();
  process.nextTick(function () { process.exit(0); });
});

app.get('/switchAllOff', function (req, res) {
	switchAllLedOff();
	res.type("application/json");
	res.send('{"status":"ok"}');
});

app.get('/changeLedInRange',function (req,res){
	var from = parseInt(req.query.from);
	var to  = parseInt(req.query.to);
	var red = req.query.red;
	var green = req.query.green;
	var blue = req.query.blue;
	var brightness = parseInt(req.query.brightness);
	if(
			( from === undefined || from < 0 || from > NUM_LEDS-1 ) ||
			( to === undefined || to < 0 || to > NUM_LEDS-1 ) ||
			( from >= to ) ||
			( red === undefined || red < 0 || red > 255 ) ||
			( green === undefined || green < 0 || green > 255 ) ||
			( blue === undefined || blue < 0 || blue > 255 ) ||
			( brightness === undefined || brightness < 0 || brightness > 100 )) {
			res.send("{}");
			return;
	}

	ws281x.setBrightness(brightness);
	for(var ledId = from;ledId<=to;ledId++) {
			var color = rgb2Int(red,green,blue);
			pixelData[ledId] = color;
	}
	ws281x.render(pixelData);
	res.type("application/json");
	res.send('{"status": "ok"}');
	return;
});

app.get('/changeLed',function (req,res){
	var ledId = parseInt(req.query.ledId);
	var red = req.query.red;
	var green = req.query.green;
	var blue = req.query.blue;
	var brightness = parseInt(req.query.brightness);
	if( ( ledId===undefined || ledId < 0 || ledId > NUM_LEDS-1 ) ||
		( red === undefined || red < 0 || red > 255 ) ||
		( green === undefined || green < 0 || green > 255 ) ||
		( blue === undefined || blue < 0 || blue > 255 ) ||
		( brightness === undefined || brightness < 0 || brightness > 100 )) {
		res.send("{}");
		return;
	}
	
	var conf = new Object();
	conf.ledId = ledId;
	conf.color = rgb2Int(red,green,blue);
	conf.brightness = brightness;
	console.log("LedId " + ledId);
	console.log("Color " + red + ";" + green + ";"+blue );
	console.log("Brightness " + brightness);
	res.type("application/json");
	res.send(JSON.stringify(conf));
	changeLed(ledId,conf.color,conf.brightness);
	return;
});

app.get('/pattern', function(req,res){
	pattern = req.query.id;
	var conf = new Object();
	switch(pattern){
		case "iterate":
			conf.pattern = "iterate";
			res.type("application/json");
			res.send(JSON.stringify(conf))
			setTimeout(function(){iterate(rgb2Int(255,255,255), 50, 500)}, 10000);
			switchAllLedOff();
			break;
		case "rainbow":
			conf.pattern = "rainbow";
			res.type("application/json");
			res.send(JSON.stringify(conf))
			setTimeout(rainbow, 10000);
			switchAllLedOff();
			break;
		default:
			res.type("application/json");
			res.send('{"pattern": "Not Found"}')
			break;
	}
	return;
})


defBrightness();

setTimeout(startupSequence, 200);

function startupSequence() {
	changeLed(ledIdInit,redColor,30);
	ledIdInit++;	
	if ( ledIdInit > NUM_LEDS ){  
		ledIdInit = 0;
		switchAllLedOff();
	}
	initTimes--;
	if(initTimes === 0) {
		switchAllLedOff();
		changeLed(7,redColor,20);
		// app.listen(8083);
	} else 
		setTimeout(startupSequence, 200);
}

function changeLed(ledId,color,brightness) {
	ws281x.setBrightness(brightness);
    	pixelData[ledId] = color;
  	ws281x.render(pixelData);
}


function switchAllLedOff() {
	ws281x.setBrightness(0);
	var noColor = rgb2Int(0,0,0);
  	for (var i = 0; i < NUM_LEDS; i++) {
    		pixelData[i] = noColor;
  	}

  	ws281x.render(pixelData);
}


function defBrightness(){
	ws281x.setBrightness(defaultBrightness);
}

function rgb2Int(r, g, b) {
  return ((r & 0xff) << 16) + ((g & 0xff) << 8) + (b & 0xff);
}

/*
*	Start LED pattern methods
*
*/

//Iterate over all of the LEDs with a given color and brightness
function iterate(color, brightness, delay){
	var offset = 0;
	ws281x.setBrightness(brightness);
	setInterval(function () {
	  var i=NUM_LEDS;
	  while(i--) {
	      pixelData[i] = 0;
	  }
	  pixelData[offset] = color;

	  offset = (offset + 1) % NUM_LEDS;
	  ws281x.render(pixelData);
	}, delay);
}

//Continually change colors smoothly. Should be set to a timeout.
function rainbow(){
	var offset = 0;
	setInterval(function () {
	  for (var i = 0; i < NUM_LEDS; i++) {
	    pixelData[i] = colorwheel((offset + i) % 256);
	  }

	  offset = (offset + 1) % 256;
	  ws281x.render(pixelData);
	}, 1000 / 30);


	// rainbow-colors, taken from http://goo.gl/Cs3H0v
	function colorwheel(pos) {
	  pos = 255 - pos;
	  if (pos < 85) { return rgb2Int(255 - pos * 3, 0, pos * 3); }
	  else if (pos < 170) { pos -= 85; return rgb2Int(0, pos * 3, 255 - pos * 3); }
	  else { pos -= 170; return rgb2Int(pos * 3, 255 - pos * 3, 0); }
	}
}