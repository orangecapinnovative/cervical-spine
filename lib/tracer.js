const cls = require('cls-hooked')
const crypto = require('crypto')

const ns = cls.createNamespace('cervical-spine-tracer')

// Generate a random hex string of length len
const generateHex = (len) => {
  return crypto.randomBytes(Math.ceil(len / 2)).toString('hex').slice(0, len);
}

const getContext = () => {
  if (!ns.active) return {}
  return {
    traceId: ns.get('traceId'),
    spanId: ns.get('spanId'),
    traceSampled: ns.get('traceSampled')
  }
}

const runWithContext = (context, callback) => {
  return ns.runAndReturn(() => {
    if (context.traceId) ns.set('traceId', context.traceId)
    if (context.spanId) ns.set('spanId', context.spanId)
    if (context.traceSampled) ns.set('traceSampled', context.traceSampled)
    return callback()
  })
}

const middleware = (req, res, next) => {
  // Parse X-Cloud-Trace-Context header
  const header = req.header('X-Cloud-Trace-Context') || ''
  const parts = header.split(';')
  const traceAndSpan = parts[0].split('/')
  
  let traceId = traceAndSpan[0]
  let spanId = traceAndSpan[1]
  const options = parts[1] || '' // e.g. "o=1"
  
  // If no traceId, generate one
  if (!traceId) {
    traceId = generateHex(32)
  }
  
  // Generate a new Span ID for this operation
  const currentSpanId = generateHex(16)
  
  ns.run(() => {
    ns.set('traceId', traceId)
    ns.set('spanId', currentSpanId)
    // parentSpanId would be 'spanId' if we wanted to store it
    ns.set('traceSampled', options.includes('o=1'))
    
    next()
  })
}

const getTraceContextHeaders = () => {
  const context = getContext()
  if (!context.traceId || !context.spanId) return {}
  
  // Propagate the *current* span and trace
  return {
    'X-Cloud-Trace-Context': `${context.traceId}/${context.spanId};o=${context.traceSampled ? '1' : '0'}`
  }
}

module.exports = {
  middleware,
  getContext,
  runWithContext,
  getTraceContextHeaders
}
