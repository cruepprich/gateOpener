gpio = require('onoff').Gpio
var x //relay = new gpio('17','out')
   ,state
   ,ON = 1
   ,OFF = 0
   ,led   = new gpio('4','out')
   ,relay  = new gpio('17','out');

//console.log('relay',relay.readSync());
console.log('on');
led.writeSync(ON); 
relay.writeSync(OFF); //relay is wired backwards 

setTimeout(function() { 
	console.log('off');
	led.writeSync(OFF); 
	relay.writeSync(ON); 
	},1000);

console.log('end')
