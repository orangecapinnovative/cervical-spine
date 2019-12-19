var puid = new (require('puid'))(false)
, debug = require('debug')('cervical-spine:node')
, express = require('express')
, bodyParser = require('body-parser')
, Redis = require('ioredis')
, EventEmitter = require('events').EventEmitter
, axios = require('axios')
, morgan = require('morgan')

var _reserved_namespace = ['broker', 'queue', 'on', 'emit', 'methods']

function generateHash (data){
  var json = JSON.stringify(data)
  if (typeof data == 'function') data = null
  if (data) {
    return require('crypto').createHash('md5').update(json).digest("hex")
  } else {
    return false
  }
}

var Spinal = function(url, options){
  var that = this
  if (typeof options == 'undefined') options = {}
  this.id = puid.generate()
  var match = []
  if (process.env.SPINAL_BROKER || url)
    match = (process.env.SPINAL_BROKER || url).match(/(spinal:\/\/)?([\w\.]+):(\d{1,5})/)
  this.broker_url = process.env.SPINAL_BROKER || url
  this.hostname = process.env.SPINAL_HOST || options.hostname || match[2]
  var port_map = null
  if (options.port_map) {
    port_map = options.port_map
  }
  if (process.env.SPINAL_PORT_MAP) {
    port_map = JSON.parse(process.env.SPINAL_PORT_MAP)
  }
  this.port = parseInt(process.env.SPINAL_PORT || options.port || match[3] || '7557')
  this.hostname_prefix = process.env.SPINAL_HOSTNAME_PREFIX || options.hostname_prefix || ''
  this.hostname_suffix = process.env.SPINAL_HOSTNAME_SUFFIX || options.hostname_suffix || ''
  this.namespace = options.namespace
  if (port_map && (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test')) {
    this.port_map = port_map
    this.port = port_map[this.namespace]
  }
  this.message_limit = process.env.SPINAL_MESSAGE_LIMIT || options.message_limit || '200mb'
  this.timeout = {}
  this.initialized = false
  this.connected = false
  this.redis_prefix = options.redis_prefix || 'spinal:'
  this._broker_data = {
    version: null,
    methods: []
  }
  this.config = {}
  this._methods = {}

  if(options.redis){
    this.redis = new Redis(options.redis)
    debug('[redis] initialize')
  }

  if (typeof this.broker_url == 'undefined')
    throw new Error("Spinal needs a broker url in the first argument")
  if (typeof this.namespace == 'undefined')
    throw new Error("Spinal needs `options.namespace` to initialize")
  if (_reserved_namespace.indexOf(this.namespace) > -1)
    throw new Error("`" + this.namespace + "` may not be used as a namespace")
  debug(that.namespace+'('+that.id+') new node')
}

Spinal.prototype.__proto__ = EventEmitter.prototype

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

Spinal.prototype.start = function(cb) {
  var that = this
  if(that.connected) {
    cb && cb()
    return that.emit('ready')
  }
  var app = express()
  // app.use(morgan('dev'))
  app.use(morgan((tokens, req, res) => {
    return [
      tokens.method(req, res),
      tokens.url(req, res),
      req.body.name,
      tokens.status(req, res),
      tokens.res(req, res, 'content-length'), '-',
      tokens['response-time'](req, res), 'ms'
    ].join(' ')
  }))
  app.use((req, res, next) => {
    res.header('X-Hostname', require('os').hostname());
    next();
  });
  app.use(bodyParser.json({ limit: that.message_limit }))
  var export_methods = []
  app.get('/healthz', function(req, res) {
    res.send({ success: true })
  })
  app.post('/', function(req, res) {
    var name = req.body.name
    var data = req.body.data
    var options = req.body.options
    debug('call ' + name)
    if (name === '_ping') {
      if (req.app.get('shuttingDown')) {
        res.status(500).send({ message: 'shutting down '})
        return
      }
      res.send({ data: 'pong'})
      return
    }
    var method = that.namespace + '.' + name
    if (that._methods[name]) {
      that._methods[name](data, function(err, respData, header) {
        if (header && header.cache && that.redis) {
          if (header.cache.key === true) header.cache.key = generateHash(data)
          var key = that.redis_prefix + method + ':' + header.cache.key
          header.cache_id = header.cache.key
          that.redis.setex(key, header.cache.ttl, JSON.stringify(respData), function(err){
            debug('[cache.write] ' + method + ' @ ' + key)
          })
        }
        if (err) {
          var returnedError = { message: err.message, stack: err.stack, data: respData, header: header }
          if (typeof err.type !== 'undefined') returnedError.type = err.type
          if (typeof err.source !== 'undefined') returnedError.source = err.source
          res.status(500).send(returnedError)
        } else {
          res.send({ data: respData, header: header })
        }
      })
    } else {
      res.status(404).send({ message: 'name "' + name + '" not found' })
    }
  })
  that.server = app.listen(that.port, function() {
    debug(that.namespace+'('+that.id+') start() at :'+that.port)
    that.initialized = true
    that.connected = true
    cb && cb()
    that.emit('listening')
    return that.emit('ready')
  })
  function shutdown() {
    that.server.close(function onServerClosed (err) {
      if (err) {
        console.error(err)
        process.exit(1)
      } else process.exit()
    })
  }
  process.on('SIGTERM', function onSigterm () {
    app.enable('shuttingDown');
    console.info('Got SIGTERM. Graceful shutdown start', new Date().toISOString())
    setTimeout(shutdown, 20 * 1000)
  })
}

Spinal.prototype.stop = function(fn) {
  if (this.server) {
    var that = this
    this.server.close(function (err) {
      that.server = null;
      fn(err)
    })
  } else if (fn) {
    fn()
  }
  this.connected = false
}

Spinal.prototype.ping = function(fn){
  this.call('_ping', this.id, fn)
}

Spinal.prototype.provide = function(name, fn) {
  if (this._methods[name])
    throw new Error("`" + name + "` method already exists")
  if (this.initialized)
    throw new Error("Cannot provide a new method after node connected to a broker")
  if (typeof fn !== 'function')
    throw new Error("Provide need a function not a "+(typeof fn))

  debug('register method('+name+')')
  var fn_name = this.namespace+'.'+name
  var that = this

  this._methods[name] = function(args, cb){
    // TODO: timeout handle
    var options = {}
    var reply = function(err, data){
      if (err && !(Object.keys(err).length === 0 && err.constructor === Object)) {
        cb(err, null, header)
        // res.status(500).send({ error: err, header: header })
        return
      }
      cb(null, data, options)
      // res.send({ data: data, header: header})
    }
    reply.log = function(data){
      if(!options.logs) options.logs = []
      options.logs.push(String(data))
    }
    reply.cache = function(ttl, key){
      options.cache = {
        ttl: ttl,
        key: key
      }
    }
    reply.send = function(data){
      cb(null, data, options)
      // res.send({ data: data, header: options })
    }
    reply.error = function(err){
      if(typeof err === 'string') err = new Error(err)
      err.options = options
      cb(err, null, options)
      // res.status(500).send({ message: err.message, options: options })
    }
    // reply.reject = function(){}
    fn(args, reply, options)
  }
  this.emit('provide', name)
}

Spinal.prototype.unprovide = function(name) {
  if(this._methods[name]){
    delete this._methods[name]
    this.emit('unprovide', name)
    return true
  }
}

Spinal.prototype.call = function(name, arg, options, callback) {
  var that = this
  if (name.indexOf('.') === -1) name = this.namespace + '.' + name
  var thatArguments = [].slice.call(arguments)
  var returnPromise = !thatArguments.some(function(arg) {return typeof arg === 'function'})
  if (typeof arg === 'function' || (returnPromise && thatArguments.length == 1)){
    callback = arg
    arg = null
    options = {}
    thatArguments = [name, arg, options, callback]
  } else if (typeof options === 'function' || (returnPromise && thatArguments.length == 2)){
    callback = options
    options = {}
    thatArguments = [name, arg, options, callback]
  } else {

  }

  if (options.timeout === undefined && isFinite(this.config.callTimeout)) {
    options.timeout = this.config.callTimeout
  }

  // middleware spinal rpc
  callback = thatArguments.pop()
  thatArguments.push(function(err, data, options){
    callback(err, data, options)
  })
  
  // name, args, options, callback
  var match = name.match(/^(.+)\.(.+)$/)
  var axiosOptions = {}
  if (options.timeout) axiosOptions.timeout = options.timeout
  var port = options.port || this.port
  var host = ''
  if (this.port_map && !options.port) {
    port = this.port_map[match[1]]
    host = 'localhost'
  } else {
    if (process.env.NODE_ENV === 'test' || match[1] === that.namespace) {
      host = 'localhost'
    } else {
      host = that.hostname_prefix + match[1] + that.hostname_suffix
    }
  }

  var promise = new Promise(function(resolve, reject) {
    if (that.redis && options.cache_id) {
      if (options.cache_id === true) options.cache_id = generateHash(arg)
      that.redis.get(that.redis_prefix+name+':'+options.cache_id, function(err, result){
        if(result){
          resolve({data: { data: JSON.parse(result), header: {from_cache: true}}})
        } else {
          debug('[rpc] '+name+' (no)cache:'+options.cache_id)
          resolve()
        }
      })
      return
    }
    resolve()
  })
  .then(function(response) {
    if (!response)
      return axios.post('http://' + host +':' + port, {
        name: match[2],
        data: arg,
        options: options
      }, axiosOptions).then((resp) => {
        that.emit('call done', name)
        return resp
      })
    else return response
  })
  
  this.emit('call', name, arg, options)
  if(returnPromise) {
    return promise.then(function(response) {
      return response.data
    }, function(err) {
      if (err.response && err.response.data && err.response.data.message) {
        var errorData = err.response.data
        var errorObject = new Error(errorData.message)
        errorObject.stack = errorData.stack
        if (typeof errorData.type !== 'undefined') errorObject.type = errorData.type
        if (typeof errorData.source !== 'undefined') errorObject.source = errorData.source
        throw errorObject
      }
      else
        throw new Error(err)
    })
  } else {
    promise
    .then(function(response) {
      if (typeof response.data.data === 'undefined') {
        response.data.data = null
      }
      callback(null, response.data.data, response.data.header)
    }, function(err) {
      if (err.response) {
        var errorData = err.response.data
        var errorObject = new Error(errorData.message)
        errorObject.stack = errorData.stack
        if (typeof errorData.type !== 'undefined') errorObject.type = errorData.type
        if (typeof errorData.source !== 'undefined') errorObject.source = errorData.source
        thatArguments[3](errorObject, errorData.data, errorData.header)
      } else {
        thatArguments[3](new Error(err.message))
      }
    })
  }
}

Spinal.prototype.worker = function(name, fn) {
  console.warn('Job queue is not currently supported in cervical-spine')
}

Spinal.prototype.job = function(name, data) {
  console.warn('Job queue is not currently supported in cervical-spine')
}

module.exports = Spinal
