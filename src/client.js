import EventEmitter from '@librpc/ee'
import { peekTransferables, uuid } from './utils.js'

class RpcClient extends EventEmitter {
  constructor ({ workers }) {
    super()
    this.workers = [...workers]
    this.idx = 0
    this.calls = {}
    this.timeouts = {}
    this.errors = {}
    this.handler = this.handler.bind(this)
    this.listen()
  }

  listen () {
    this.workers.forEach(worker => worker.addEventListener('message', this.handler))
  }

  handler (e) {
    var { error, method, eventName, data, uid } = e.data
    if (error) {
      this.reject(uid, error)
    }
    if (method) {
      this.resolve(uid, data)
    }
    if (eventName) {
      this.emit(eventName, data)
    }
  }

  reject (uid, error) {
    if (this.errors[uid]) {
      this.errors[uid](new Error(error))
      this.clear(uid)
    }
  }

  resolve (uid, data) {
    if (this.calls[uid]) {
      this.calls[uid](data)
      this.clear(uid)
    }
  }

  clear (uid) {
    clearTimeout(this.timeouts[uid])
    delete this.timeouts[uid]
    delete this.calls[uid]
    delete this.errors[uid]
  }

  call (method, data, { timeout = 2000 } = {}) {
    var uid = uuid()
    var transferables = peekTransferables(data)
    this.workers[this.idx].postMessage({ method, uid, data }, transferables)
    this.idx = ++this.idx % this.workers.length // round robin
    return new Promise((resolve, reject) => {
      this.timeouts[uid] = setTimeout(() => this.reject(`RPC timeout exceeded for '${method}' call`), timeout)
      this.calls[uid] = resolve
    })
  }
}

export default RpcClient
