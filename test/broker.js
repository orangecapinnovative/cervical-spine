var Broker = require('../').Broker
var Spinal = require('../').Node
var _ = require('lodash')

describe('Broker', function() {
  var broker = null
  beforeEach( function(){ broker = new Broker() })
  afterEach( function(done){ broker.stop(done) })

  describe('Structure', function() {
    it('Should start broker with default port', function(done) {
      broker.start(function() {
        assert.equal(this.port, 7557)
        done()
      })
    })

    it('Should start broker with specific port', function(done) {
      broker.start(37557, function() {
        assert.equal(this.port, 37557)
        done()
      })
    })

    it('After stop() should start() again', function(done){
      broker.start(37557, function(){
        broker.stop(function(){
          broker.start(37557, function(){
            done()
          })
        })
      })
    })
  })

  describe('Connection', function() {

    it('After node start() Broker should knows a new node', function(done) {
      var spinal = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'foobar', heartbeat_interval: 500
      })

      spinal.provide('foo', function(data, res){
        res.send(data)
      })

      broker.start(function() {
        spinal.start(function(){
          setTimeout(function(){
            expect(_.keys(broker.router.routing)).eql(['foobar.foo'])
            spinal.stop(done)
          }, 500)
        })
      })
    })

    it('After broker losing heartbeat from node should remove a node out', function(done){
      var spinal = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'foobar', heartbeat_interval: 200
      })
      spinal.provide('foo', function(data, res){ res.send(data) })
      broker.start(function() {
        spinal.start(function(){
          spinal.client.sock.close()
          // clearTimeout(spinal.timeout.heartbeat)
          setTimeout(function(){
            expect(broker.router.nodes[spinal.id]).not.exist
            done()
          }, 1100)
        })
      })
    })

    it('After node stop() Broker should remove a node', function(done) {
      var spinal = new Spinal('spinal://127.0.0.1:7557', {
        namespace: 'foobar', heartbeat_interval: 500
      })
      spinal.provide('foo', function(data, res){ res.send(data) })
      broker.start(function() {
        spinal.start(function(){
          spinal.stop(function(){
            expect(broker.router.node).empty
            done()
          })
        })
      })
    })
  })

  describe('Nodes', function() {
    it('add multiple nodes with a single method and a single namespace', function(done) {

      var spinalA = new Spinal('spinal://127.0.0.1:7557', { namespace: 'foobar' })
      var spinalB = new Spinal('spinal://127.0.0.1:7557', { namespace: 'foobar' })

      spinalA.provide('foo', function(data, res){ res.send(data) })
      spinalB.provide('foo', function(data, res){ res.send(data) })

      broker.start(function() {
        spinalA.start(function(){
          spinalB.start(function(){
            expect(_.keys(broker.router.nodes)).have.to.length(2)
            expect(_.keys(broker.router.namespace)).have.to.length(1)
            expect(_.keys(broker.router.routing)).have.to.length(1)
            expect(broker.router.namespace).have.property('foobar')
            expect(_.keys(broker.router.routing)).eql(['foobar.foo'])
            // stop
            spinalA.stop(function(){
              spinalB.stop(done)
            })
          })
        })
      })

    })

    it('add multiple nodes with multiple methods in a single namespace', function(done) {

      var spinalA = new Spinal('spinal://127.0.0.1:7557', { namespace: 'foobar' })
      var spinalB = new Spinal('spinal://127.0.0.1:7557', { namespace: 'foobar' })

      spinalA.provide('foo', function(data, res){ res.send(data) })
      spinalB.provide('bar', function(data, res){ res.send(data) })

      broker.start(function() {
        spinalA.start(function(){
          spinalB.start(function(){
            expect(_.keys(broker.router.nodes)).have.to.length(2)
            expect(_.keys(broker.router.namespace)).have.to.length(1)
            expect(_.keys(broker.router.routing)).have.to.length(2)
            expect(broker.router.namespace).have.property('foobar')
            expect(_.keys(broker.router.routing)).eql(['foobar.foo', 'foobar.bar'])
            // stop
            spinalA.stop(function(){
              spinalB.stop(done)
            })
          })
        })
      })
    })

    it('loadbalance method between nodes by roundrobin', function(done) {

      var spinalA = new Spinal('spinal://127.0.0.1:7557', { namespace: 'foobar' })
      var spinalB = new Spinal('spinal://127.0.0.1:7557', { namespace: 'foobar' })
      var spinal = new Spinal('spinal://127.0.0.1:7557', { namespace: 'barfoo' })

      spinalA.provide('test', function(data, res){ res.send(1) })
      spinalB.provide('test', function(data, res){ res.send(2) })

      broker.start(function() {
        spinalA.start(function(){
          spinalB.start(function(){
            spinal.start(function(){
              expect(_.size(broker.router.nodes)).to.equal(3)
              var data = []
              spinal.call('foobar.test', 'test', function(err, result){
                data.push(result)
                spinal.call('foobar.test', 'test', function(err, result){
                  data.push(result)
                  expect(data).to.deep.equal([1,2])
                  // stop
                  spinalA.stop(function(){
                    spinalB.stop(function(){
                      spinal.stop(done)
                    })
                  })
                })
              })
            })
          })
        })
      })
    })


    it('loadbalance method between nodes should skip broker node', function(done) {
      var spinalA = new Spinal('spinal://127.0.0.1:7557', { namespace: 'foobar' })
      var spinalB = new Spinal('spinal://127.0.0.1:7557', { namespace: 'foobar' })
      var spinal = new Spinal('spinal://127.0.0.1:7557', { namespace: 'barfoo' })

      spinalA.provide('foo', function(data, res){ res.send(1) })
      spinalB.provide('foo', function(data, res){ res.send(2) })

      broker.start(function() {
        spinalA.start(function(){
          spinalB.start(function(){
            spinalB.client.sock.close()
            spinalB.server.sock.close()
            spinal.start(function(){
              spinal.call('foobar.foo', function(err, result){
                expect(result).to.equal(1)
                spinal.call('foobar.foo', function(err, result){
                  expect(result).to.equal(1)
                  // stop
                  spinalA.stop(function(){
                    spinalB.stop(function(){
                      spinal.stop(done)
                    })
                  })
                })
              })
            })
          })
        })
      })
    })


  })

  // describe('Internal', function(){
  //   it('Router::listNamespaces')
  // })

  // it.skip('_ping service', function(done) {
  //   var spinalA = new Spinal('spinal://127.0.0.1:7557', {
  //     namespace: 'foobar', heartbeat_interval: 500
  //   })
  //   assert.equal('pong', 'pong')
  //   done()
  // })

  // it.skip('_handshake service', function(done) {
  //   assert.equal('pong', 'pong')
  //   done()
  // })

  // it.skip('_heartbeat service', function(done) {
  //   assert.equal('pong', 'pong')
  //   done()
  // })

})
