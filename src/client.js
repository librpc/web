import EventEmitter from '@librpc/ee'
import { peekTransferables, guid } from './utils.js'

class RpcClient extends EventEmitter {
  constructor ({ worker }) {
    super()
    this.worker = worker
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
    this.worker.postMessage({ method, uid, data }, transferables)
    return new Promise((resolve, reject) => {
      this.timeouts[uid] = setTimeout(() => reject(new Error(`RPC timeout exceeded for '${method}' call`)), timeout)
      this.calls[uid] = resolve
    })
  }
}

export default RpcClient
