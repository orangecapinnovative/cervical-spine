const express = require('express')
const Spinal = require('cervical-spine').Node
const axios = require('axios')

// Booking Service with Express + Cervical-Spine
const app = express()
app.use(express.json())

// Initialize cervical-spine node
const spinal = new Spinal('spinal://127.0.0.1:7557', {
  namespace: 'booking',
  port_map: {
    booking: 7557,
    payment: 7558
  }
})

// In-memory storage for demo
const bookings = new Map()
let bookingIdCounter = 1

// Cervical-spine methods
spinal.provide('createBooking', async (data, res) => {
  try {
    const booking = {
      id: bookingIdCounter++,
      userId: data.userId,
      serviceType: data.serviceType,
      amount: data.amount,
      status: 'pending',
      createdAt: new Date()
    }
    
    bookings.set(booking.id, booking)
    res.send(booking)
  } catch (error) {
    res.error(error.message)
  }
})

spinal.provide('confirmBooking', async (data, res) => {
  try {
    const booking = bookings.get(data.bookingId)
    if (!booking) {
      return res.error('Booking not found')
    }
    
    booking.status = 'confirmed'
    booking.paymentId = data.paymentId
    bookings.set(booking.id, booking)
    
    res.send(booking)
  } catch (error) {
    res.error(error.message)
  }
})

spinal.provide('getBooking', async (data, res) => {
  try {
    const booking = bookings.get(data.bookingId)
    if (!booking) {
      return res.error('Booking not found')
    }
    res.send(booking)
  } catch (error) {
    res.error(error.message)
  }
})

// Express REST endpoints
app.post('/bookings', async (req, res) => {
  try {
    // Create booking via cervical-spine
    const booking = await new Promise((resolve, reject) => {
      spinal.call('createBooking', req.body, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
    
    res.json(booking)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.post('/bookings/:id/pay', async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id)
    const booking = bookings.get(bookingId)
    
    if (!booking) {
      return res.status(404).json({ error: 'Booking not found' })
    }

    // Call Moleculer payment service via HTTP
    const paymentResponse = await axios.post('http://localhost:7558/api/payment/process', {
      bookingId: booking.id,
      amount: booking.amount,
      userId: booking.userId,
      method: req.body.paymentMethod || 'credit_card'
    })

    if (paymentResponse.data.success) {
      // Confirm booking via cervical-spine
      const updatedBooking = await new Promise((resolve, reject) => {
        spinal.call('confirmBooking', {
          bookingId: booking.id,
          paymentId: paymentResponse.data.paymentId
        }, (err, result) => {
          if (err) reject(err)
          else resolve(result)
        })
      })
      
      res.json({
        booking: updatedBooking,
        payment: paymentResponse.data
      })
    } else {
      res.status(400).json({ error: 'Payment failed' })
    }
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

app.get('/bookings/:id', async (req, res) => {
  try {
    const bookingId = parseInt(req.params.id)
    const booking = await new Promise((resolve, reject) => {
      spinal.call('getBooking', { bookingId }, (err, result) => {
        if (err) reject(err)
        else resolve(result)
      })
    })
    
    res.json(booking)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Start services
spinal.start(() => {
  console.log('Booking cervical-spine service started on port 7557')
})

app.listen(3000, () => {
  console.log('Booking Express API started on port 3000')
})

module.exports = { app, spinal } 