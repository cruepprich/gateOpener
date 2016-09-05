/*
  Continously scans for peripherals and prints out message when they enter/exit
    In range criteria:      RSSI < threshold
    Out of range criteria:  lastSeen > grace period
  based on code provided by: Mattias Ask (http://www.dittlof.com)
*/
var noble = require('noble');

var RSSI_THRESHOLD    = -100;
var EXIT_GRACE_PERIOD = 2000; // milliseconds

var inRange = [];

var gpio = require('onoff').Gpio
  , led = new gpio(4, 'out')
  , remote = new gpio(17,'out')
  , iv
  , t1 = new Date().getTime()
  , t2
  , diff
  , ledBlinks = false
  , scanInterval = 1
  , beaconConnected = false
  , gateState = 'STOPPED' //MOVING,STOPPED
  , ledState;

// make LED blink
function blinkLED(freq) {
   if (!ledBlinks) {
	ledBlinks = true
	   freq = (freq == undefined ? 200 : freq);
		iv = setInterval(function() {
			onoff = led.readSync() ^ 1;
			led.writeSync( onoff );
		 }, freq);
  }
}

function pressButton() {
  //press button for n seconds
  remote.writeSync(1);
  setTimeout(function() {
    remote.writeSync(0);
  }, 1000);

}

function activateGate() {
  gateState = 'MOVING';
  pressButton();
  console.log('Gate state',gateState);
  //wait until gate is open
  setTimeout(function() {
    gateState = 'STOPPED';
  }, 3000);
}

noble.on('discover', function(peripheral) {
  if (peripheral.rssi < RSSI_THRESHOLD) {
    // ignore
    console.log('ignoring peripheral.rssi',peripheral.rssi);
    return;
  }

  var id = peripheral.id;
  var entered = !inRange[id];

  if (entered) {
    inRange[id] = {
      peripheral: peripheral
    };

    if (peripheral.advertisement.localName == 'TurnoutNow') {
      console.log('"' + peripheral.advertisement.localName + '" entered (RSSI ' + peripheral.rssi + ') ' + new Date());
      //console.log(peripheral + '" entered (RSSI ' + peripheral.rssi + ') ' + new Date());
      //led.writeSync(1);
      if (gateState == 'STOPPED') {
        activateGate();
      }  
    }
  }

  inRange[id].lastSeen = Date.now();
});

setInterval(function() {
  for (var id in inRange) {
    console.log('Gate state',gateState);
    if (inRange[id].lastSeen < (Date.now() - EXIT_GRACE_PERIOD)) {
      var peripheral = inRange[id].peripheral;

      if (peripheral.advertisement.localName == 'TurnoutNow') {
        console.log('"' + peripheral.advertisement.localName + '" exited (RSSI ' + peripheral.rssi + ') ' + new Date());
        //console.log(peripheral + '" exited (RSSI ' + peripheral.rssi + ') ' + new Date());
        //led.writeSync(0);
      }

      delete inRange[id];
    }
  }
}, EXIT_GRACE_PERIOD / 2);

noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning([], true);
  } else {
    noble.stopScanning();
  }
});
