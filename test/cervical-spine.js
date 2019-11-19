var Spinal = require('../').Node
var Broker = require('../').Broker
var fs = require('fs')

describe('CervicalSpine', function(){
  var spinal = null
  beforeEach(function(done){
    spinal = new Spinal('spinal://127.0.0.1:7557', {
      namespace: 'nock_node',
      port_map: {
        nock_node: 7557,
        bunny: 7658,
      }
    })
    done()
  })
  afterEach(function(done){ spinal.stop(done) })
  describe('Structure', function() {
    it('Bind specific port', function(done) {
      var spinal = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny_test_port', heartbeat_interval: 500, port: 7558
      })
      spinal.start(function(){
        expect(spinal.server.address().port).to.equal(7558)
        spinal.stop(function() {
          done()
        })
      })
    })

    it('Should throw error when init without a broker url', function() {
      expect(function(){new Spinal()}).to.throw(/url/)
    })

    it('Should throw error when init Spinal without options.namespace', function() {
      expect(function(){new Spinal('spinal://127.0.0.1:7557')}).to.throw(/options.namespace/)
    })
    
    it('Should throw error when init Spinal with reserved namespace', function() {
      expect(function(){
        new Spinal('spinal://127.0.0.1:7557', {namespace: 'broker'})
      }).to.throw(/broker/)
    })
    
    it('Should start with namespace', function() {
      var spinal = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny_with_namespace', heartbeat_interval: 500
      })
      assert.equal(spinal.namespace, 'bunny_with_namespace')
    })

    it('Should add method', function() {
      spinal.provide('jump', function(){} )
      expect(spinal._methods.jump).to.be.a('function')
      assert.isFunction(spinal._methods.jump)
    })
    
    it('Should throw error when pass non function when provide', function() {
      expect(function(){
        spinal.provide('jump', 'String' )
      }).to.throw(/function/)
    })
    
    it('Should throw error when add a duplicate method name', function() {
      spinal.provide('jump', function(){} )
      expect(spinal._methods.jump).to.be.a('function')
      expect(function(){
        spinal.provide('jump', function(){} )
      }).to.throw(/already exists/)
    })

    it('Should throw error when add method after node initialized', function(done) {
      spinal.start(function(){
        expect(function(){
          spinal.provide('jump', function(){} )
        }).to.throw(/connected/)
        done()
      })
    })
    
    it('Should removed method', function() {
      spinal.provide('jump', function(){} )
      expect(spinal._methods.jump).to.be.a('function')
      expect(spinal.unprovide('jump')).to.be.true
      expect(spinal._methods.jump).to.not.a('function')
    })

    it('Should be able to add config variable', function() {
      spinal.set('key', 'value')
      expect(spinal.config.key).to.equal('value')
    })

    it('Should be able to get config variable', function() {
      spinal.config.key2 = 'value2'
      expect(spinal.get('key2')).to.equal('value2')
    })

    it('Should be able to remove config variable', function() {
      spinal.config.key3 = 'value3'
      spinal.unset('key3')
      expect(spinal.config.key3).to.be.undefined
    })
  })
  describe('Connection', function() {
    it('After called start() all sockets should be ready', function(done) {
      spinal.start(function(){
        expect(spinal.connected).to.be.true
        done()
      })
    })

    it('Multple called start() should be fine', function(done) {
      spinal.start(function(){
        spinal.start(function(){
          expect(spinal.connected).to.be.true
          done()
        })
      })
    })

    it('After stop() and start() again should be fine', function(done) {
      spinal.provide('test', function(data, res){
        res.send('ok')
      })
      spinal.start(function(){
        expect(spinal.connected).to.be.true
        spinal.stop(function(){
          expect(spinal.connected).to.be.false
          spinal.start(function(){
            expect(spinal.connected).to.be.true
            spinal.call('test', function(err, result){
              expect(result).to.equal('ok')
              done()
            })
          })
        })
      })
    })

    it('After called stop() all sockets should close correctly', function(done) {
      spinal.start(function(){
        spinal.stop(function(){
          expect(spinal.server).to.be.null
          done()
        })
      })
    })
  })

  describe('Response', function() {
    it('Correct response object structure', function(done) {
      spinal.provide('jump', function(arg, res){
        assert.isFunction(res)
        assert.isFunction(res.send)
        assert.isFunction(res.error)
        assert.isFunction(res.cache)
        done()
      })
      spinal._methods.jump()
    })

    it('Should send data thru res()', function(done) {
      spinal.provide('jump', function(arg, res){
        assert.isFunction(res)
        res(null, 'Bunny is jump ' + arg.height + ' cm from ' + arg.place)
      })
      spinal.start(function(){
        spinal.call('jump', {place: 'farm', height: 12}, function(err, msg) {
          assert.isNull(err)
          assert.equal(msg, 'Bunny is jump 12 cm from farm');
          done()
        })
      })
    })
    
    it('Should send data thru res.send', function(done) {
      spinal.provide('jump', function(arg, res){
        assert.isFunction(res.send)
        res.send('Bunny is jump ' + arg.height + ' cm from ' + arg.place)
      })
      spinal.start(function(){
        spinal.call('jump', {place: 'farm', height: 12}, function(err, msg) {
          assert.isNull(err)
          assert.equal(msg, 'Bunny is jump 12 cm from farm');
          done()
        })
      })
    })

    it('Should send error thru res.error (with string)', function(done) {
      spinal.provide('jump', function(arg, res){
        assert.isFunction(res.error)
        res.error('Error message')
      })
      spinal.start(function(){
        var a = spinal.call('jump', 'ok', function(err, data) {
          assert.isNotNull(err)
          assert.equal(err.message, 'Error message');
          done()
        })
      })
    })

    it('Should send error thru res.error (with Error object)', function(done) {
      spinal.provide('jump', function(arg, res){
        assert.isFunction(res.error)
        res.error(new Error('Error message'))
      })
      spinal.start(function(){
        var a = spinal.call('jump', 'ok', function(err, data) {
          assert.isNotNull(err)
          assert.equal(err.message, 'Error message');
          done()
        })
      })
    })

    it('Should send error thru res.error (with Error object that include a key "type")', function(done) {
      spinal.provide('jump', function(arg, res){
        assert.isFunction(res.error)
        var error = new Error('Error message')
        error.type = 'Type'
        console.log(error);
        res.error(error)
      })
      spinal.start(function(){
        var a = spinal.call('jump', 'ok', function(err, data) {
          assert.isNotNull(err)
          assert.equal(err.message, 'Error message');
          assert.equal(err.type, 'Type');
          done()
        })
      })
    })

    it('Should send error thru res.error (with Error object that include a key "source")', function(done) {
      spinal.provide('jump', function(arg, res){
        assert.isFunction(res.error)
        var error = new Error('Error message')
        error.source = 'Source'
        res.error(error)
      })
      spinal.start(function(){
        var a = spinal.call('jump', 'ok', function(err, data) {
          assert.isNotNull(err)
          assert.equal(err.message, 'Error message');
          assert.equal(err.source, 'Source');
          done()
        })
      })
    })

    it('Should not error when response `undefined`', function(done) {
      spinal.provide('jump', function(arg, res){
        res(null, undefined)
      })
      spinal.start(function(){
        spinal.call('jump', 'ok', function(err, data) {
          assert.isNull(err)
          assert.isNull(data);
          done()
        })
      })
    })
    
    it('Should not error when response empty', function(done) {
      spinal.provide('jump', function(arg, res){
        res()
      })
      spinal.start(function(){
        spinal.call('jump', 'ok', function(err, data) {
          assert.isNull(err)
          assert.isNull(data);
          done()
        })
      })
    })
    
    it('Should not error when response undefined first parameter',
    function(done) {
      spinal.provide('jump', function(arg, res){
        res(undefined)
      })
      spinal.start(function(){
        spinal.call('jump', 'ok', function(err, data) {
          assert.isNull(err)
          assert.isNull(data);
          done()
        })
      })
    })

    it('Should not error when response with empty object {}', function(done) {
      spinal.provide('jump', function(arg, res){
        res({})
      })
      spinal.start(function(){
        spinal.call('jump', 'ok', function(err, data) {
          assert.isNull(err)
          assert.isNull(data);
          done()
        })
      })
    })
  })
  describe('Call', function() {
    it('Should return promise', function(done){
      spinal.provide('jump', function(arg, res){ res.send(arg) })
      spinal.start(function(){
        var promise = spinal.call('jump',{a:1, b:2})
        expect(promise).to.be.instanceof(Promise)
        promise.then(function(response) {
          expect(response.data).to.deep.equal({a:1, b:2})
          done()
        })
      })
    });

    it('Should return reject a promise got an error', function(done){
      spinal.provide('ump', function(arg, res){ res.send(arg) })
      spinal.start(function(){
        var promise = spinal.call('_not_found',{a:1, b:2})
        expect(promise).to.be.instanceof(Promise)
        promise.then(function(response) {
          throw new Error("Promise should not be resolved")
        }).catch(function(err) {
          expect(err).to.be.instanceof(Error)
          expect(err).to.not.be.null
          done()
        })
      })
    });

    it('Should success call with an argument', function(done){
      spinal.provide('jump', function(arg, res){ res.send(arg) })
      spinal.start(function(){
        spinal.call('jump', {a:1, b:2}, function(err, result){
          expect(result).to.deep.equal({a:1, b:2})
          done()
        })
      })
    })

    it('Should success call without an argument (default: null)', function(done){
      spinal.provide('jump', function(arg, res){ res.send(arg) })
      spinal.start(function(){
        spinal.call('jump', function(err, result){
          expect(result).to.equal(null)
          done()
        })
      })
    })

    it('Should get an error after call a method that not exist (internal)', function(done) {
      spinal.start(function(){
        spinal.call('_not_found', {place: 'farm', height: 12}, function(err, msg) {
          assert.isNotNull(err)
          done()
        })
      })
    })

    it('Should call internal method via broker (without namespace)', function(done) {
      spinal.provide('jump', function(data, res) {
        res.send('Bunny is jump ' + data.height + ' cm from ' + data.place)
      })
      spinal.start(function(){
        spinal.call('jump', {place: 'farm', height: 12}, function(err, msg) {
          expect(err).to.not.exist
          expect(msg).to.equal('Bunny is jump 12 cm from farm')
          done()
        })
      })
    })

    it('Should get an error when exceed timeout option', function(done) {
      spinal.provide('jump', function(data, res) {})
      spinal.start(function(){
        spinal.call('jump', {a: 1}, {timeout: 250}, function(err, result){
          expect(err).to.exist
          expect(err.message).to.match(/timeout/i)
          done()
        })
      })
    })

    it('Should call internal method via broker (with namespace)', function(done) {
      spinal.provide('jump', function(data, res) {
        res.send('Bunny is jump ' + data.height + ' cm from ' + data.place)
      })
      spinal.start(function(){
        spinal.call(spinal.namespace+'.jump', {place: 'farm', height: 12}, function(err, msg) {
          assert.isNull(err)
          assert.equal(msg, 'Bunny is jump 12 cm from farm');
          done()
        })
      })
    })
    
    it('Should call method between two node', function(done) {
      this.timeout(1500);
      var dogSpinal = new Spinal('spinal://127.0.0.1:7558', {
        namespace: 'dog', heartbeat_interval: 500
      })

      dogSpinal.provide('howl', function(name, res) {
        res.send(name + ' is howl')
      })

      var catSpinal = new Spinal('spinal://127.0.0.1:7559', {
        namespace: 'cat', heartbeat_interval: 500
      })

      catSpinal.provide('meaw', function(name, res) {
        res.send(name + ' is meaw')
      })

      dogSpinal.start(function() {
        catSpinal.start(function() {
          catSpinal.call('dog.howl', 'John', {port: 7558}, function(err, msg) {
            assert.isNull(err)
            assert.equal(msg, 'John is howl')
            dogSpinal.call('cat.meaw', 'Jane', {port: 7559}, function(err, msg) {
            assert.isNull(err)
            assert.equal(msg, 'Jane is meaw')
              dogSpinal.stop()
              catSpinal.stop()
              done()
            })
          })
        })
      })
    })

    it('Should end call after client call timeout.', function(done){
      var spinal2 = new Spinal('spinal://127.0.0.1:7558', {
        namespace: 'bunny_dummy', heartbeat_interval: 500
      })

      spinal2.provide('foo', function(err, res){
        setTimeout(function(){ res.send("bar") }, 1000)
      })

      spinal2.start(function(){
        spinal.start(function(){
          spinal.set('callTimeout', 200)
          spinal.call('bunny_dummy.foo', null, {port:7558}, function(err, res){
            expect(err.message).to.match(/timeout/i)
            expect(err.message).to.match(/200ms/i)
            spinal.stop(function(){
              spinal2.stop(done)
            })
          })
        })
      })
    })

    it('Should end call after client custom call timeout.', function(done){
      var spinal2 = new Spinal('spinal://127.0.0.1:7558', {
        namespace: 'bunny_dummy', heartbeat_interval: 500
      })

      spinal2.provide('foo', function(err, res){
        setTimeout(function(){ res.send("bar") }, 1000)
      })

      spinal2.start(function(){
        spinal.start(function(){
          spinal.set('callTimeout', 200)
          spinal.call('bunny_dummy.foo', null, {timeout: 300, port:7558}, function(err, res){
            expect(err.message).to.match(/timeout/i)
            expect(err.message).to.match(/300ms/i)
            spinal.stop(function(){
              spinal2.stop(done)
            })
          })
        })
      })
    })
  })

  describe('Event', function() {
    it('ready', function(done) {
      spinal.on('ready', function(){
        done()
      })
      spinal.start()
    })

    it('listening', function(done) {
      spinal.on('listening', function(){
        done()
      })
      spinal.start()
    })

    it('provide', function(done) {
      spinal.on('provide', function(){
        done()
      })
      spinal.provide('ping', function(){})
    })

    it('unprovide', function(done) {
      spinal.on('unprovide', function(){
        done()
      })
      spinal.provide('ping', function(){})
      spinal.unprovide('ping')
    })

    it('call / call done', function(done) {
      var count = 0
      var check = function(){
        count++
        if(count==2) done()
      }
      spinal.on('call', check)
      spinal.on('call done', check)
      spinal.provide('event_test_call', function(data, res){ res.send('ok') })
      spinal.start(function(){
        spinal.call('event_test_call', function(){})
      })
    })
  })
  describe('Internal Call', function() {
    it('ping()', function(done){
      spinal.start(function(){
        spinal.ping(function(err, data){
          assert.isNull(err)
          assert.equal(data, 'pong')
          done()
        })
      })
    })
  })
  describe('Port Map', function() {
    it('works', function(done) {
      var spinalBunny = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny',
        port_map: {
          nock_node: 7557,
          bunny: 7658,
        }
      })
      spinalBunny.provide('foo', function(err, res){
        setTimeout(function(){ res.send("bar") }, 1000)
      })
      spinalBunny.start(function() {
        expect(spinal.port).to.equal(7557)
        expect(spinalBunny.port).to.equal(7658)
        spinal.call('bunny.foo', function(err, data) {
          expect(err).to.not.exist
          expect(data).to.equal('bar')
          spinalBunny.stop(done)
        })
      })
    })
    it('works when calling same service', function(done) {
      var spinalBunny = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny',
        port_map: {
          nock_node: 7557,
          bunny: 7658,
        }
      })
      spinalBunny.provide('foo', function(err, res){
        setTimeout(function(){ res.send("bar") }, 1000)
      })
      spinalBunny.start(function() {
        spinalBunny.call('foo', function(err, data) {
          expect(err).to.not.exist
          expect(data).to.equal('bar')
          done()
        })
      })
    })
  })
})
