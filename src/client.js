import { peekTransferables, guid } from './utils.js'

class RpcClient {
  constructor ({ worker }) {
    this.worker = worker
    this.events = {}
    this.calls = {}
    this.timeouts = {}
    this.listen()
  }

  listen () {
    this.worker.addEventListener('message', this.handler.bind(this))
  }

  handler (e) {
    var { method, eventName, data, uid } = e.data
    if (method) {
      this.resolve(uid, data)
    }
    if (eventName) {
      this.trigger(eventName, data)
    }
  }

  resolve (uid, data) {
    if (this.calls[uid]) {
      clearTimeout(this.timeouts[uid])
      this.calls[uid](data)
      delete this.timeouts[uid]
      delete this.calls[uid]
    }
  }

  trigger (eventName, data) {
    var handlers = this.events[eventName] || []
    for (var i = 0; i < handlers.length; i++) {
      handlers[i](data)
    }
  }

  call (method, data, { timeout = 2000 } = {}) {
    var uid = guid()
    var transferables = peekTransferables(data)
    this.worker.postMessage({ method, uid, data }, transferables)
    return new Promise((resolve, reject) => {
      this.timeouts[uid] = setTimeout(() => reject(new Error(`RPC timeout exceeded for '${method}' call`)), timeout)
      this.calls[uid] = resolve
    })
  }

  on (eventName, handler) {
    var handlers = this.events[eventName] || []
    ;(this.events[eventName] = handlers).push(handler)
  }

  off (eventName, handler) {
    var handlers = this.events[eventName] || []
    var idx = handlers.indexOf(handler)
    if (idx !== -1) {
      this.events[eventName].splice(idx, 1)
    }
  }
}

export default RpcClient
