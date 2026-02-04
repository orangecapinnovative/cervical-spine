const tracer = require('./tracer')

const getType = (severity) => {
  return severity || 'INFO'
}

const log = (severity, message, data) => {
  const context = tracer.getContext()
  const entry = {
    severity: getType(severity),
    message: message,
    timestamp: new Date().toISOString(),
    ...data
  }
  
  if (context.traceId) {
    // Format: projects/[PROJECT-ID]/traces/[TRACE-ID]
    // We assume project ID is available or just put trace ID if not perfectly known, 
    // but GCP expects the full path for linking.
    // If PROJECT_ID is not set, we might miss the linking, but at least we have the ID.
    const projectId = process.env.GCP_PROJECT || process.env.GOOGLE_CLOUD_PROJECT || 'my-project'
    entry['logging.googleapis.com/trace'] = `projects/${projectId}/traces/${context.traceId}`
  }
  
  if (context.spanId) {
    entry['logging.googleapis.com/spanId'] = context.spanId
  }
  
  if (context.traceSampled) {
    entry['logging.googleapis.com/traceSampled'] = true
  }
  
  console.log(JSON.stringify(entry))
}

module.exports = {
  info: (message, data) => log('INFO', message, data),
  error: (message, error) => {
    const data = {}
    if (error instanceof Error) {
      data.stack = error.stack
      data.message = error.message
    } else if (typeof error === 'object') {
      Object.assign(data, error)
    }
    log('ERROR', message, data)
  },
  warn: (message, data) => log('WARNING', message, data),
  debug: (message, data) => log('DEBUG', message, data)
}
