const { ServiceBroker } = require('moleculer')
const ApiGateway = require('moleculer-web')
const axios = require('axios')

// Create Moleculer service broker
const broker = new ServiceBroker({
  nodeID: 'payment-node',
  logger: true
})

// API Gateway for HTTP access
broker.createService({
  name: 'api',
  mixins: [ApiGateway],
  settings: {
    port: 7558,
    routes: [{
      path: '/api',
      aliases: {
        'POST /payment/process': 'payment.processPayment',
        'GET /payment/:id': 'payment.getPayment',
        'POST /payment/refund': 'payment.refundPayment'
      }
    }]
  }
})

// Payment Service
broker.createService({
  name: 'payment',
  
  settings: {
    // Cervical-spine booking service config
    bookingService: {
      host: 'localhost',
      port: 7557
    }
  },

  actions: {
    processPayment: {
      params: {
        bookingId: 'number',
        amount: 'number',
        userId: 'string',
        method: 'string'
      },
      async handler(ctx) {
        const { bookingId, amount, userId, method } = ctx.params
        
        try {
          // Simulate payment processing
          const paymentId = 'pay_' + Date.now()
          const success = Math.random() > 0.1 // 90% success rate
          
          if (success) {
            // Store payment record
            const payment = {
              id: paymentId,
              bookingId,
              amount,
              userId,
              method,
              status: 'completed',
              processedAt: new Date()
            }
            
            // Store in memory (in real app, use database)
            this.payments = this.payments || new Map()
            this.payments.set(paymentId, payment)
            
            this.logger.info(`Payment processed: ${paymentId} for booking ${bookingId}`)
            
            return {
              success: true,
              paymentId,
              amount,
              status: 'completed'
            }
          } else {
            throw new Error('Payment processing failed')
          }
        } catch (error) {
          this.logger.error('Payment processing error:', error)
          return {
            success: false,
            error: error.message
          }
        }
      }
    },

    getPayment: {
      params: {
        id: 'string'
      },
      async handler(ctx) {
        const paymentId = ctx.params.id
        this.payments = this.payments || new Map()
        
        const payment = this.payments.get(paymentId)
        if (!payment) {
          throw new Error('Payment not found')
        }
        
        return payment
      }
    },

    refundPayment: {
      params: {
        paymentId: 'string',
        bookingId: 'number',
        reason: 'string'
      },
      async handler(ctx) {
        const { paymentId, bookingId, reason } = ctx.params
        
        try {
          // Get payment details
          this.payments = this.payments || new Map()
          const payment = this.payments.get(paymentId)
          
          if (!payment) {
            throw new Error('Payment not found')
          }

          // Call booking service via cervical-spine to get booking details
          const bookingResponse = await axios.post('http://localhost:7557/', {
            name: 'getBooking',
            data: { bookingId },
            options: {}
          })

          if (bookingResponse.status !== 200) {
            throw new Error('Failed to get booking details')
          }

          const booking = bookingResponse.data.data
          
          // Process refund
          const refundId = 'refund_' + Date.now()
          const refund = {
            id: refundId,
            paymentId,
            bookingId,
            amount: payment.amount,
            reason,
            status: 'completed',
            processedAt: new Date()
          }

          // Store refund record
          this.refunds = this.refunds || new Map()
          this.refunds.set(refundId, refund)

          // Update payment status
          payment.status = 'refunded'
          payment.refundId = refundId
          this.payments.set(paymentId, payment)

          this.logger.info(`Refund processed: ${refundId} for payment ${paymentId}`)

          return {
            success: true,
            refundId,
            amount: payment.amount,
            booking,
            processedAt: refund.processedAt
          }
        } catch (error) {
          this.logger.error('Refund processing error:', error)
          throw error
        }
      }
    },

    // Action to call booking service methods
    callBookingService: {
      params: {
        method: 'string',
        data: 'object'
      },
      async handler(ctx) {
        const { method, data } = ctx.params
        
        try {
          const response = await axios.post('http://localhost:7557/', {
            name: method,
            data,
            options: {}
          })
          
          if (response.status === 200) {
            return response.data.data
          } else {
            throw new Error(`Booking service error: ${response.data.message}`)
          }
        } catch (error) {
          this.logger.error(`Error calling booking service method ${method}:`, error.message)
          throw error
        }
      }
    }
  },

  methods: {
    // Helper method to call booking service
    async callBooking(method, data) {
      return this.actions.callBookingService({ method, data })
    }
  },

  started() {
    this.logger.info('Payment service started')
    this.payments = new Map()
    this.refunds = new Map()
  }
})

// Start the broker
broker.start()
  .then(() => {
    console.log('Payment Moleculer service started on port 7558')
    console.log('API Gateway available at http://localhost:7558/api')
  })

module.exports = broker 