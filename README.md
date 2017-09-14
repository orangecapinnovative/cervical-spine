# Cervical Spine

A seamless port from [Spinal](https://github.com/jitta/spinal) broker architecture to broker-less DNS-based microservice architecture

This library is used as an intention to remove broker from the system and use HTTP call to DNS-based services instead. Common use-case is [Docker Swarm](https://docs.docker.com/engine/swarm/) and [Kubernetes](https://kubernetes.io/).

No change in code is needed. Just replace your spinal library in `package.json` to point at `cervical-spine` instead

```json
...
"spinal": "cervical-spine",
...
```

Currently, the library is under development. Planned supported features will not include job queue.