var Spinal = require('../').Node
var Broker = require('../').Broker
var request = require('supertest')

describe('Metrics', function() {
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


  it('/metrics', function(done) {
    request(broker.restapi.app)
      .get('/metrics')
      .expect(200, function(err, res){
        expect(err).to.be.null
        done()
      })
  })

  it.skip('should count number of calls correctly', function(done) { })

})
