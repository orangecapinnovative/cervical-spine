# AGENTS.md - Cervical Spine

## Project Overview
**Cervical Spine** is a Node.js library designed to migrate from a specific broker-based architecture ("Spinal") to a broker-less, DNS-based microservice architecture. It replicates the API of the original Spinal library but uses direct HTTP communication between services instead of a central message broker.

## Tech Stack
- **Language**: Node.js
- **Communication**: HTTP (via `express` for server, `axios` for client)
- **Data Format**: JSON
- **Caching**: Redis (optional)
- **Testing**: Mocha, Chai
- **Utilities**: `puid`, `debug`

## Core Concepts

### 1. Broker-less Architecture
Unlike Spinal, this library does not interpret `spinal://` URLs as a connection to a central broker. Instead, it resolves service locations based on:
1.  **DNS/Hostname**: Derives target host from the service namespace + prefix/suffix.
2.  **Port Mapping**: For local development, maps namespaces to specific ports.

### 2. Communication Protocol
-   **Transport**: HTTP POST
-   **Path**: `/`
-   **Body**:
    ```json
    {
      "name": "method_name",
      "data": { ...arguments... },
      "options": { ... }
    }
    ```
-   **Internal Ping**: `_ping` method is handled internally for health checks.

### 3. Namespace & Methods
-   **Namespace**: Identifies the service (e.g., `user`, `order`).
-   **Methods**: exposing functions via `spinal.provide('methodName', fn)`.
-   **Calling**: `spinal.call('service.method', data, callback)`.

## Project Structure
-   **`lib/node.js`**: The core implementation.
    -   Initializes an Express server.
    -   Handles incoming requests at `POST /`.
    -   Sends outgoing requests via Axios.
    -   Manages Redis caching if configured.
-   **`lib/broker.js`**: A stub to maintain API compatibility but warns that a broker is not needed.
-   **`test/`**: Contains unit tests verifying connection, method provision, calling, and caching.

## Usage Guide

### Initialization
```javascript
const Spinal = require('cervical-spine').Node;
const spinal = new Spinal('spinal://127.0.0.1:7557', {
  namespace: 'my_service',
  // Local development port mapping
  port_map: {
    my_service: 7557,
    other_service: 7658
  }
});
```

### Providing Methods
```javascript
spinal.provide('myMethod', function(data, res) {
  // logic...
  res.send({ result: 'success' });
});

spinal.start();
```

### Calling Methods
```javascript
// Calls 'other_service.someMethod'
spinal.call('other_service.someMethod', { id: 1 }, function(err, result) {
  if (err) console.error(err);
  else console.log(result);
});
```

## Development & Testing
-   **Run Tests**: `npm test` or `npx mocha test`.
-   **Debugging**: Set `DEBUG=cervical-spine:node` to see internal logs.

## Migration Note
This library is a drop-in replacement.
1.  Replace `require('spinal')` with `require('cervical-spine')`.
2.  Remove broker infrastructure.
3.  Configure `SPINAL_HOSTNAME_PREFIX` / `SPINAL_HOSTNAME_SUFFIX` or usage `port_map` for discovery.
