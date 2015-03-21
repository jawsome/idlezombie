var Master = function (msg,config) {
  if(msg.nickname === config.master) {
    return true;
  }
  else {
    return false;
  }
}

var commands = {
  'shutdown': function (args, config, msg, rpc) {
    if(Master(msg, config)) {
      rpc.emit('destroyClient', config.nick);
    }
  },
  'hi': function (args, config, msg, rpc) {
    if(msg.type = 'pm') {
      var to = msg.nickname;
    }
    if(msg.type = 'chan') {
      var to = msg.target;
    }
    rpc.emit('call', config.nick, 'privmsg', [to, 'Hi, ' + msg.nickname + '!']);
  },
  'ns-register': function (args, config, msg, rpc) {
    if(Master(msg, config)) {
      rpc.emit('call', config.nick, 'privmsg', [config.nickserv, 'register ' + config.password + ' ' + config.email]);
    }
  }
};

module.exports = commands;
