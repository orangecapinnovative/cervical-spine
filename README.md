# Cervical Spine

A seamless port from [Spinal](https://github.com/jitta/spinal) broker architecture to broker-less DNS-based microservice architecture

This library is used as an intention to remove broker from the system and use HTTP call to DNS-based services instead. Common use-case is [Docker Swarm](https://docs.docker.com/engine/swarm/) and [Kubernetes](https://kubernetes.io/).

Just remove spinal and install cervical-spine instead.

```
npm install cervical-spine
```

Then, replace each `require('spinal')` to `require('cervical-spine')`.

## How it works

Cervical Spine has same API calls with Spinal. For example, when you call `user.get` with an argument `{"id":"1"}` it will send a HTTP POST request to `http://user:7557/` with data `{"name":"get","data":{"id":1}}`.

You can also specify host prefix and suffix by assigning env variable `SPINAL_HOSTNAME_PREFIX` and `SPINAL_HOSTNAME_SUFFIX`. Alternatively passing an option `hostname_prefix` and `hostname_prefix` when initializing a spinal node. For example, having `SPINAL_HOSTNAME_PREFIX=production- SPINAL_HOSTNAME_SUFFIX=-service` will make a call to `http://production-user-service:7557/`

Caching still works by passing `redis` options at node initialization instead of broker in Spinal.

Unlike broker-based approach, this approach introduce new challenge, that is local development. The port would collide if more than one service is run at the same time. Port map is introduced to solve the problem. Simply specify option `port_map` while initializing a node like this:

```javascript
  spinal = new Spinal('spinal://127.0.0.1:7557', {
    namespace: 'nock_node',
    port_map: {
      nock_node: 7557,
      bunny: 7658,
    }
  })
```
When running with `NODE_ENV=development`, port map will be used. Each service will create a HTTP server using thier port assigned in port map without colliding. Alternatively, an env variable of `SPINAL_PORT_MAP` can also be used (encoded in JSON format).

# Cervical-Spine + Moleculer.js Integration Example

This example demonstrates how to integrate **cervical-spine** (Express + cervical-spine) with **Moleculer.js** for cross-service communication.

## Architecture

- **Booking Service**: Express.js REST API + cervical-spine (Port 3000 REST, 7557 cervical-spine)
- **Payment Service**: Moleculer.js microservice (Port 7558)

## Communication Patterns

### 1. Booking → Payment (HTTP)
```
[Booking Service] --HTTP POST--> [Payment Service API Gateway]
```

### 2. Payment → Booking (cervical-spine)
```
[Payment Service] --HTTP POST--> [Booking Service cervical-spine]
```

## Quick Start

### Install Dependencies
```bash
npm install
```

### Start Both Services
```bash
# Start both services concurrently
npm run start:both

# Or start individually
npm run start:booking  # Terminal 1
npm run start:payment  # Terminal 2
```

### Run Integration Tests
```bash
npm test
```

## API Endpoints

### Booking Service (Express + cervical-spine)

**REST API (Port 3000):**
- `POST /bookings` - Create booking
- `POST /bookings/:id/pay` - Process payment
- `GET /bookings/:id` - Get booking

**cervical-spine methods (Port 7557):**
- `createBooking(data)` - Create new booking
- `confirmBooking(data)` - Confirm booking with payment
- `getBooking(data)` - Get booking details

### Payment Service (Moleculer.js)

**HTTP API (Port 7558):**
- `POST /api/payment/process` - Process payment
- `GET /api/payment/:id` - Get payment details
- `POST /api/payment/refund` - Process refund

**Moleculer actions:**
- `payment.processPayment` - Process payment
- `payment.getPayment` - Get payment details
- `payment.refundPayment` - Process refund
- `payment.callBookingService` - Call booking service methods

## Example Usage

### 1. Create Booking and Payment
```bash
# Create booking
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{"userId":"user123","serviceType":"hotel","amount":150.00}'

# Process payment (booking calls payment)
curl -X POST http://localhost:3000/bookings/1/pay \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod":"credit_card"}'
```

### 2. Process Refund (Payment calls Booking)
```bash
curl -X POST http://localhost:7558/api/payment/refund \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"pay_123","bookingId":1,"reason":"Cancellation"}'
```

## Integration Details

### Booking Service calling Payment Service
The booking service uses standard HTTP requests to call the Moleculer payment service:

```javascript
const paymentResponse = await axios.post('http://localhost:7558/api/payment/process', {
  bookingId: booking.id,
  amount: booking.amount,
  userId: booking.userId,
  method: 'credit_card'
})
```

### Payment Service calling Booking Service
The payment service calls cervical-spine endpoints using the cervical-spine protocol:

```javascript
const bookingResponse = await axios.post('http://localhost:7557/', {
  name: 'getBooking',
  data: { bookingId },
  options: {}
})
```

## Key Benefits

1. **Flexibility**: Mix different frameworks in the same system
2. **Gradual Migration**: Migrate services one at a time
3. **Best of Both Worlds**: Use cervical-spine's simplicity + Moleculer's features
4. **Team Autonomy**: Different teams can use their preferred frameworks

## Communication Flow

```
┌─────────────────┐    HTTP     ┌──────────────────┐
│ Booking Service │ ──────────► │ Payment Service  │
│ (Express +      │             │ (Moleculer.js)   │
│  cervical-spine)│ ◄────────── │                  │
└─────────────────┘ cervical-   └──────────────────┘
                    spine
```

Both services can call each other using their respective protocols, enabling seamless integration between different microservice frameworks.
