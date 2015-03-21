var winston = require('winston');
var moment = require('moment');
var momenttz = require('moment-timezone');
var async = require('async');
var factory = require('irc-factory'), // this should be 'irc-factory' in your project
	axon = factory.axon,
	api = new factory.Api();
var customLevels = {
  levels: {
    warn: 2,
    error: 3,
    info: 1,
    pm: 2,
    idle: 1,
    notice: 1,
    command: 2
  },
  colors: {
    warn: 'yellow',
    error: 'red',
    info: 'blue',
    pm: 'green',
    idle: 'magenta',
    notice: 'gray',
    command: 'cyan'
  }
}
winston.addColors(customLevels.colors);
var logger = new (winston.Logger)({
  levels: customLevels.levels,
  transports: [
    new (winston.transports.Console)({
      colorize: true,
      timestamp: function () {
        return '[' + moment().tz('US/Central').format('MMM D HH:mm:ss') + ']';
      }
    }),
    new (winston.transports.File)({
      colorize: true,
      timestamp: function () {
        return '[' + moment().tz('US/Central').format('MMM D HH:mm:ss') + ']';
      },
      filename: 'logs/idle.log',
      level: 'idle'
    })
  ]
});

var config = require('./config.json');
var commands = require('./commands');


var options = {
		events: 31920,
		rpc: 31930,
		automaticSetup: true,
		fork: true
	},
	interfaces = api.connect(options),
	events = interfaces.events,
	rpc = interfaces.rpc;
events.on('message', function(msg) {
	if (msg.event == 'synchronize') {
		if (msg.keys.length === 0) {
			setTimeout(initializeClients(config), 1500);
			// no client lets create one in 1.5 seconds
		}
                else {
                  for (var i = 0; i < msg.keys.length; i++) {
                    var client = msg.keys[i];
                    if(config[client]['online'] != true) {
                      config[client]['online'] = true;
                    }
                  }
                  Object.keys(config).forEach(function (key) {
                    if(config[key]['enabled'] && msg.keys.indexOf(key) < 0) {
                      createClient(config[key]);
                    }
                  });
                }
	}

	if (config[msg.event[0]] && msg.event[1] == 'registered') {
          var id = config[msg.event[0]];
          logger.log('info', 'Client successfully connected to server. (' + id.nick + ' - ' + id.server  +')');
          for(var i = 0; i < id.channels.length; i++) {
                config[id.nick]['online'] = true;
		rpc.emit('call', id.nick, 'join', id.channels[i]);
          }
	}

       if (config[msg.event[0]] && msg.event[1] === 'privmsg' && config[msg.event[0]]['online']) {
         var conf = config[msg.event[0]];
         if(msg.message.target === conf.nick) {
           msg.message.type = 'pm';
           // isPM
           if(msg.message.message[0] === '!') {
             logger.log('command', '(' + msg.message.nickname + '->' + msg.message.target + '): ' + msg.message.message);            
             // isCommand
             var args = msg.message.message.split(' ');
             var command = args.shift().replace(/^\!/,'');
             if(commands[command]) {
               commands[command](args, conf, msg.message, rpc);
             }
           }
           else {
             logger.log('pm', '(' + msg.message.nickname + '->' + msg.message.target + '): ' + msg.message.message);
             rpc.emit('call', conf.nick, 'privmsg', [conf.master, msg.message.message]);
           }
         }
         else if(msg.message.target === conf.idlechannel) {
           msg.message.type = 'chan';
           // isIdleMessage
           if(msg.message.nickname === conf.idlemaster) {
             // isIdleMaster
             // Handle idle message
             if(msg.message.message.indexOf(conf.nick) > -1) {
               logger.log('idle', msg.message.message);
             }
           }
           else {
            if(msg.message.message[0] === '!') {
             logger.log('command', '(' + msg.message.nickname + '->' + msg.message.target + '): ' + msg.message.message);
             var args = msg.message.message.split(' ');
             var command = args.shift().replace(/^\!/,'');
             if(commands[command]) {
               commands[command](args, conf, msg.message, rpc);
             }
          
           }
          }            
         }
         else {
           msg.message.type = 'chan';
           // Handle channel message
           if(msg.message.message[0] === '!') {
             logger.log('command', '(' + msg.message.nickname + '->' + msg.message.target + '): ' + msg.message.message);
             var args = msg.message.message.split(' ');
             var command = args.shift().replace(/^\!/,'');
             if(commands[command]) {
               commands[command](args, conf, msg.message, rpc);
             }
           }
         }
            
       }

    if (config[msg.event[0]] && msg.event[1] === 'notice') {
      logger.log('notice', '[' +  msg.message.nickname + '->' + msg.event[0] + ']: ' + msg.message.message);
    }

//	console.log(msg);
});

function createClient(config) {
  logger.log('info', 'Summoning ' + config.nick + '...');
  rpc.emit('createClient', config.nick , config);
}

function initializeClients(config) {
  async.eachSeries(Object.keys(config), function(key, callback) {
    var time = Math.floor(Math.random() * (20000 - 3000 + 1)) + 4000;
    createClient(config[key]);
    var callthecallback = function () {
      logger.log('info', 'Waited ' + time + 'ms before spawning another client.');
      callback();    
    };
    var calmLoad = setTimeout(callthecallback, time);
  }, function (err) {


  });
}
