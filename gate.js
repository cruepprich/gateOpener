/*
  Continously scans for peripherals and prints out message when they enter/exit
    In range criteria:      RSSI < threshold
    Out of range criteria:  lastSeen > grace period
  based on code provided by: Mattias Ask (http://www.dittlof.com)
*/

/** 
 * Node.js BLE enabled relay switch
 * Created for ODTUG Geekathon 2016
 * Source (GitHub): https://github.com/cruepprich/gateOpener/blob/master/gate.js
 * License: GNU General Public License, version 3 (GPLv3)
 *  - http://opensource.org/licenses/gpl-3.0.html
 * @author Christoph Ruepprich https://ruepprich.wordpress.com
 * 
 * Used to read a bluetooth low energy emitter (BLE) beacon and trigger a garage door
 * opener when the beacon comes into range.
 * Requires a Raspberry Pi 2 with a bluetooth USB adapter (https://amzn.com/B009ZIILLI)
 * 
 * The noble library is used to read bluetooth signals.
 * (https://github.com/sandeepmistry/noble)
 *
 * The onoff library is used to access the GPIO ports on the Raspberry Pi.
 * (https://github.com/fivdi/onoff)
 **/

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
  var entered = !inRange[id]; //checks if this id has been seen

  //if this is a new id, check if it is our beacon and activate the gate
  if (entered) {
    inRange[id] = {
      peripheral: peripheral
    };

    //our beacon has the localName TurnoutNow
    //if it is detected activate the gate
    if (peripheral.advertisement.localName == 'TurnoutNow') {
      console.log('"' + peripheral.advertisement.localName + '" entered (RSSI ' + peripheral.rssi + ') ' + new Date());
      
      //If the gate is not already moving, activate it
      if (gateState == 'STOPPED') {
        activateGate();
      }  
    }
  }

  //record the current time of when this beacon has been seen
  inRange[id].lastSeen = Date.now();
});


//periodically check if the beacon is no longer of consequence
setInterval(function() {

  //loop through all the beacons that we saw recently
  for (var id in inRange) {

    //if we have not seen it for more than two seconds, we delete it
    if (inRange[id].lastSeen < (Date.now() - EXIT_GRACE_PERIOD)) {
      delete inRange[id];
    }
  }
}, EXIT_GRACE_PERIOD / 2);


//Check bluetooth state. If powered on then start scanning
noble.on('stateChange', function(state) {
  if (state === 'poweredOn') {
    noble.startScanning([], true);
  } else {
    noble.stopScanning();
  }
});
