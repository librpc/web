import EventEmitter from '@librpc/ee'
import { peekTransferables, guid } from './utils.js'

class RpcClient extends EventEmitter {
  constructor ({ workers }) {
    super()
    this.workers = workers
    this.idx = 0
    this.calls = {}
    this.timeouts = {}
    this.handler = this.handler.bind(this)
    this.listen()
  }

  listen () {
    this.workers.forEach(worker => worker.addEventListener('message', this.handler))
  }

  handler (e) {
    var { method, eventName, data, uid } = e.data
    if (method) {
      this.resolve(uid, data)
    }
    if (eventName) {
      this.emit(eventName, data)
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

  call (method, data, { timeout = 2000 } = {}) {
    var uid = guid()
    var transferables = peekTransferables(data)
    this.idx = ++this.idx % this.workers.length // round robin
    this.workers[this.idx].postMessage({ method, uid, data }, transferables)
    return new Promise((resolve, reject) => {
      this.timeouts[uid] = setTimeout(() => reject(new Error(`RPC timeout exceeded for '${method}' call`)), timeout)
      this.calls[uid] = resolve
    })
  }
}

export default RpcClient
