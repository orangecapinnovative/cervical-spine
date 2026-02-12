var Broker = function() {
  require('./logger').warn('This is cervical-spine library and broker should not be run')
}

Broker.prototype.start = function(cb) {
  require('./logger').warn('This is cervical-spine library and broker should not be run')
  cb && cb()
}

Broker.prototype.stop = function(cb) {
  require('./logger').warn('This is cervical-spine library and broker should not be run')
  cb && cb()
}

module.exports = Broker