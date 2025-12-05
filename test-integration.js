const axios = require('axios')

// Wait for services to be ready
const delay = ms => new Promise(resolve => setTimeout(resolve, ms))

async function testIntegration() {
  console.log('🧪 Starting integration tests...\n')
  
  // Wait for services to start
  await delay(2000)
  
  try {
    // Scenario 1: Booking Service calls Payment Service
    console.log('📋 Scenario 1: Booking → Payment')
    console.log('Creating a new booking...')
    
    // Create booking via booking service REST API
    const bookingResponse = await axios.post('http://localhost:3000/bookings', {
      userId: 'user123',
      serviceType: 'hotel',
      amount: 150.00
    })
    
    const booking = bookingResponse.data
    console.log('✅ Booking created:', {
      id: booking.id,
      userId: booking.userId,
      amount: booking.amount,
      status: booking.status
    })
    
    // Process payment via booking service
    console.log('\n💳 Processing payment through booking service...')
    const paymentResponse = await axios.post(`http://localhost:3000/bookings/${booking.id}/pay`, {
      paymentMethod: 'credit_card'
    })
    
    console.log('✅ Payment processed:', {
      bookingStatus: paymentResponse.data.booking.status,
      paymentId: paymentResponse.data.payment.paymentId,
      amount: paymentResponse.data.payment.amount
    })
    
    // Scenario 2: Payment Service calls Booking Service
    console.log('\n\n💰 Scenario 2: Payment → Booking')
    console.log('Processing refund via payment service...')
    
    const refundResponse = await axios.post('http://localhost:7558/api/payment/refund', {
      paymentId: paymentResponse.data.payment.paymentId,
      bookingId: booking.id,
      reason: 'Customer requested cancellation'
    })
    
    console.log('✅ Refund processed:', {
      refundId: refundResponse.data.refundId,
      amount: refundResponse.data.amount,
      bookingId: refundResponse.data.booking.id,
      bookingStatus: refundResponse.data.booking.status
    })
    
    // Test direct cervical-spine call from payment to booking
    console.log('\n🔗 Testing direct cervical-spine communication...')
    
    // Create another booking to test direct cervical-spine call
    const directBookingResponse = await axios.post('http://localhost:3000/bookings', {
      userId: 'user456',
      serviceType: 'flight',
      amount: 300.00
    })
    
    const directBooking = directBookingResponse.data
    console.log('✅ Direct booking created for testing:', {
      id: directBooking.id,
      amount: directBooking.amount
    })
    
    // Test payment service calling booking service directly via cervical-spine
    const directCallResponse = await axios.post('http://localhost:7558/api/payment/process', {
      bookingId: directBooking.id,
      amount: directBooking.amount,
      userId: directBooking.userId,
      method: 'paypal'
    })
    
    console.log('✅ Direct payment via Moleculer → cervical-spine:', {
      success: directCallResponse.data.success,
      paymentId: directCallResponse.data.paymentId
    })
    
    console.log('\n🎉 All integration tests passed!')
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message)
    process.exit(1)
  }
}

// Run tests
testIntegration()
  .then(() => {
    console.log('\n✨ Integration test completed successfully!')
    process.exit(0)
  })
  .catch(error => {
    console.error('❌ Integration test failed:', error)
    process.exit(1)
  }) 