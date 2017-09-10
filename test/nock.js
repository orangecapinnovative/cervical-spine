var Spinal = require('../').Node
var Broker = require('../').Broker
var fs = require('fs')

describe('Nock', function() {
  var broker = null
  var spinal = null
  var PATH = __dirname + '/nock.tmp'
  before(function(done){
    broker = new Broker()
    broker.start(done)
    if (!fs.existsSync(PATH)) fs.mkdirSync(PATH)
  })
  beforeEach(function(done){
    spinal = new Spinal('spinal://127.0.0.1:7557', {
      namespace: 'nock_node', heartbeat_interval: 500
    })
    done()
  })
  afterEach(function(done){ spinal.stop(done) })
  after(function(done){
    if (fs.existsSync(PATH)) {
      var list = fs.readdirSync(PATH)
      for (var i = 0; i < list.length; i++) {
        fs.unlinkSync(PATH + '/' + list[i])
      }
      fs.rmdirSync(PATH)
    }
    broker.stop(done)
  })

  describe('Structure', function() {
    it('spinal.nock should be a function', function(){
      expect(spinal.nock).to.be.a('function')
    })

    it('spinal.nock() should throw error', function(){
      expect(function(){spinal.nock()}).to.throw(/directory/)
    })

    it('spinal.nock("/unknow/path") should throw error', function(){
      expect(function(){spinal.nock()}).to.throw(/directory/)
    })

    it('spinal.nock("/correct/path") should be fine', function(){
      expect(function(){spinal.nock(PATH)}).to.not.throw()
    })

    it('made call without namespace should work too', function(done){
      var provider = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'nock_node', heartbeat_interval: 500
      })
      provider.provide('ping-ns', function(data, res){
        res.send('pong!')
      })
      provider.start(function(){
        spinal.nock(PATH)
        spinal.nock.rec()
        spinal.start(function(){
          spinal.call('ping-ns', function(err, data){
            var filepath = PATH + '/nock_node.ping-ns.json'
            expect(fs.existsSync(filepath)).to.be.true
            spinal.nock.stop().start()
            spinal.call('ping-ns', function(err, data){
              provider.stop(done)
            })
          })
        })
      })
    })

  })

  describe('Record', function() {
    it('rec() should be a function', function(){
      expect(spinal.nock.rec).to.be.a('function')
    })

    it('call rec() before spinal.nock() should throw error', function(){
      expect(function(){spinal.nock.rec()}).to.throw()
    })

    it('rec() should be a function', function(){
      expect(spinal.nock.rec).to.be.a('function')
    })

    it('rec() should thow error if in replay state', function(){
      spinal.nock(PATH)
      spinal.nock.start()
      expect(function(){ spinal.nock.rec() }).to.throw(/cannot record/i)
    })

    it('call rec() multiple times should be fine', function(){
      spinal.nock(PATH)
      spinal.nock.rec()
      expect(function(){ spinal.nock.rec() }).to.not.throw()
    })

    it('rec() should save data correctly when we made a call without arguments', function(done){
      var provider = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny', heartbeat_interval: 500
      })
      provider.provide('ping', function(data, res){
        res.send('pong!')
      })
      provider.start(function(){
        spinal.nock(PATH)
        spinal.nock.rec()
        spinal.start(function(){
          spinal.call('bunny.ping', function(err, data){
            var filepath = PATH + '/bunny.ping.json'
            expect(fs.existsSync(filepath)).to.be.true
            var fixture = JSON.parse(fs.readFileSync(filepath))
            expect(fixture.err).to.be.null
            expect(fixture.result).to.equal('pong!')
            provider.stop(done)
          })
        })
      })
    })

    it('rec() should save data correctly when we made a simple call', function(done){
      var message = {a: 1, b: false, c: 'String'}
      var provider = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny', heartbeat_interval: 500
      })
      provider.provide('ping2', function(data, res){
        res.send(data)
      })
      provider.start(function(){
        spinal.nock(PATH)
        spinal.nock.rec()
        spinal.start(function(){
          spinal.call('bunny.ping2', message, function(err, data){
            var filepath = PATH + '/bunny.ping2?a=1&b=false&c=String.json'
            expect(fs.existsSync(filepath)).to.be.true
            var fixture = JSON.parse(fs.readFileSync(filepath))
            expect(fixture.err).to.be.null
            expect(fixture.result).to.deep.equal(message)
            provider.stop(done)
          })
        })
      })
    })

    it('rec() should save data correctly when we made a huge data call', function(done){
      var message = []
      for (var i = 0; i < 20; i++)
        message.push('this is so long what should we do')

      var hash = require('crypto').createHash('md5')
        .update(JSON.stringify(message)).digest("hex")
      var provider = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny', heartbeat_interval: 500
      })
      provider.provide('ping', function(data, res){
        res.send(data)
      })
      provider.start(function(){
        spinal.nock(PATH)
        spinal.nock.rec()
        spinal.start(function(){
          spinal.call('bunny.ping', message, function(err, data){
            var filepath = PATH + '/bunny.ping?' + hash + '.json'
            expect(fs.existsSync(filepath)).to.be.true
            var fixture = JSON.parse(fs.readFileSync(filepath))
            expect(fixture.err).to.be.null
            provider.stop(done)
          })
        })
      })
    })

  })

  describe('Replay', function() {

    it('start() should be a function', function(){
      expect(spinal.nock.start).to.be.a('function')
    })

    it('call start() before spinal.nock() should throw error', function(){
      expect(function(){spinal.nock.start()}).to.throw()
    })

    it('start() should be a function', function(){
      expect(spinal.nock.start).to.be.a('function')
    })

    it('start() should thow error if in replay state', function(){
      spinal.nock(PATH)
      spinal.nock.rec()
      expect(function(){ spinal.nock.start() }).to.throw(/cannot start/i)
    })

    it('call start() multiple times should be fine', function(){
      spinal.nock(PATH)
      spinal.nock.start()
      expect(function(){ spinal.nock.start() }).to.not.throw()
    })

    it('start() should replay data correctly when we made a call without arguments', function(done){
      var provider = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny', heartbeat_interval: 500
      })
      provider.provide('pong', function(data, res){
        res.send('ping!')
      })
      provider.start(function(){
        spinal.nock(PATH)
        spinal.nock.rec()
        spinal.start(function(){
          spinal.call('bunny.pong', function(err, data){
            spinal.nock.stop().start()
            spinal.call('bunny.pong', function(err, data){
              expect(data).to.equal('ping!')
              provider.stop(done)
            })
          })
        })
      })
    })

    it('start() should replay data correctly when we made a simple call', function(done){
      var output = {}
      var provider = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny', heartbeat_interval: 500
      })
      provider.provide('pong2', function(data, res){
        output[Math.floor(Math.random()*100000000)] = Math.floor(Math.random()*100000000)
        res.send(output)
      })
      provider.start(function(){
        spinal.nock(PATH)
        spinal.nock.rec()
        spinal.start(function(){
          spinal.call('bunny.pong2', {ok: 1}, function(err, data){
            spinal.nock.stop()
            spinal.call('bunny.pong2', {ok: 1}, function(err, data){
              expect(data).to.deep.equal(output)
              provider.stop(done)
            })
          })
        })
      })
    })


    it('start() should replay data correctly when we made a huge data call', function(done){
      var message = []
      for (var i = 0; i < 20; i++)
        message.push('this is so long what should we do')

      var hash = require('crypto').createHash('md5')
        .update(JSON.stringify(message)).digest("hex")
      var output = {}
      var provider = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'bunny', heartbeat_interval: 500
      })
      provider.provide('pong3', function(data, res){
        output[Math.floor(Math.random()*100000000)] = Math.floor(Math.random()*100000000)
        res.send(output)
      })
      provider.start(function(){
        spinal.nock(PATH)
        spinal.nock.rec()
        spinal.start(function(){
          spinal.call('bunny.pong3', message, function(err, data){
            spinal.nock.stop().start()
            spinal.call('bunny.pong3', message, function(err, data){
              expect(data).to.deep.equal(output)
              provider.stop(done)
            })
          })
        })
      })
    })

    it('start({strict: true}) should not replay if no exists fixture', function(done){
      spinal.nock(PATH)
      spinal.nock.start()
      spinal.start(function(){
        spinal.call('unknow_space.ping', function(err, data){
          expect(err.message).to.contain('No data exists')
          done()
        })
      })
    })

    it('start({strict: false}) should by pass call to broker', function(done){
      var provider = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'nock_strict_false', heartbeat_interval: 500
      })
      provider.provide('ping', function(data, res){
        res.send('pong!')
      })
      provider.start(function(){
        spinal.nock(PATH)
        spinal.nock.start({strict: false})
        spinal.start(function(){
          spinal.call('nock_strict_false.ping', function(err, data){
            expect(data).to.equal('pong!')
            provider.stop(done)
          })
        })
      })
    })

  })


})
