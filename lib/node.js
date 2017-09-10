var Spinal = function(url, options){
  this.config = {}
}

Spinal.prototype.set = function(key, val) {
  return this.config[key] = val
}

Spinal.prototype.get = function(key) {
  return this.config[key]
}

Spinal.prototype.unset = function(key) {
  delete this.config[key]
  return true
}

Spinal.prototype.start = function(callback) {
}

Spinal.prototype.stop = function(fn) {
}

Spinal.prototype.ping = function(fn) {
}

Spinal.prototype.provide = function(name, fn) {
}

Spinal.prototype.unprovide = function(name) {
}

Spinal.prototype.call = function(name, arg, options, callback) {
  // if (name.indexOf('.') === -1) name = this.namespace + '.' + name
  // var thatArguments = [].slice.call(arguments)
  // var returnPromise = !thatArguments.some(function(arg) {return typeof arg === 'function'})
  // var promise = new Promise(function(resolve, reject) {
  //   if (typeof arg === 'function' || (returnPromise && thatArguments.length == 1)){
  //     callback = arg
  //     arg = null
  //     options = {}
  //     thatArguments = [name, arg, options, callback]
  //   } else if (typeof options === 'function' || (returnPromise && thatArguments.length == 2)){
  //     callback = options
  //     options = {}
  //     thatArguments = [name, arg, options, callback]
  //   } else {

  //   }
  //   if(returnPromise) {
  //     callback = function(err, data, header) {
  //       if (err !== null) {
  //         return reject(err)
  //       }
  //       resolve({data: data, header: header})
  //     }
  //     thatArguments.pop()
  //     thatArguments.push(callback)
  //   }

  //   if (options.timeout === undefined && isFinite(this.config.callTimeout)) {
  //     options.timeout = this.config.callTimeout
  //   }

  //   // middleware spinal rpc
  //   callback = thatArguments.pop()
  //   thatArguments.push(function(err, data, options){
  //     callback(err, data, options)
  //   })

  //   thatArguments.unshift('rpc')
  //   this.client.call.apply(this.client, thatArguments)
  //   this.emit('call', name, arg, options)
  // }.bind(this))

  // if(returnPromise) {
  //   return promise
  // }
}

Spinal.prototype.worker = function(name, fn) {
  console.warn('Job queue is not currently supported in cervical-spine')
}

Spinal.prototype.job = function(name, data) {
  console.warn('Job queue is not currently supported in cervical-spine')
}

module.exports = Spinal
