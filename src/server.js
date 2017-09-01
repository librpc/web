/* eslint-env serviceworker */
import { peekTransferables } from './utils.js'

class RpcServer {
  constructor (handlers) {
    this.handlers = handlers
    this.listen()
  }

  listen () {
    self.addEventListener('message', this.handler.bind(this))
  }

  handler (e) {
    var { method, uid, data } = e.data
    if (this.handlers[method]) {
      Promise.all([method, uid, this.handlers[method](data)]).then(this.reply)
    }
  }

  reply ([method, uid, data]) {
    var transferables = peekTransferables(data)
    self.postMessage({ method, uid, data }, transferables)
  }

  emit (eventName, data) {
    self.postMessage({
      eventName,
      data
    })
  }
}

export default RpcServer
