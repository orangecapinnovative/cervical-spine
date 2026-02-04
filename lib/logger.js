
const getType = (severity) => {
  return severity || 'INFO'
}

const log = (severity, message, data) => {
  const entry = {
    severity: getType(severity),
    message: message,
    timestamp: new Date().toISOString(),
    ...data
  }
  
  console.log(JSON.stringify(entry))
}

module.exports = {
  info: (message, data) => log('INFO', message, data),
  error: (message, error) => {
    const data = {}
    if (error instanceof Error) {
      data.stack = error.stack
      data.message = error.message // Prioritize error message if message is implied
    } else if (typeof error === 'object') {
      Object.assign(data, error)
    }
    
    // If message is provided, it overrides or complements. 
    // If message is just the error message, we might duplicating.
    // Let's stick to simple:
    log('ERROR', message, data)
  },
  warn: (message, data) => log('WARNING', message, data),
  debug: (message, data) => log('DEBUG', message, data)
}
