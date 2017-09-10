var Spinal = require('../').Node
var Broker = require('../').Broker
var request = require('supertest')

describe('REST API', function() {
  var broker = null
  var spinal = null
  beforeEach(function(done){
    broker = new Broker({redis: 6379, restapi: 7577})
    broker.start(done)
  })
  beforeEach(function(done){
    spinal = new Spinal('spinal://127.0.0.1:7557', { namespace: 'bunny' })
    done()
  })
  afterEach(function(done){ spinal.stop(done) })
  afterEach(function(done){ broker.stop(done) })

  it('Dashboard', function(done) {
    request(broker.restapi.app)
      .get('/')
      .expect(200, function(err, res){
        expect(err).to.be.null
        done()
      })
  })

  it('/methods', function(done) {
    request(broker.restapi.app)
      .get('/methods')
      .expect(200, function(err, res){
        expect(err).to.be.null
        done()
      })
  })

  it('/nodes', function(done) {
    spinal.start(function(){
      request(broker.restapi.app)
        .get('/nodes')
        .expect(200, function(err, res){
          expect(err).to.be.null
          done()
        })
    })
  })

  it('404 file not found', function(done) {
    request(broker.restapi.app)
      .get('/_file_not_found')
      .expect(404, function(err, res){
        expect(err).to.be.null
        done()
      })
  })


})
