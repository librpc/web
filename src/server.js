/* eslint-env serviceworker */
import { peekTransferables } from './utils.js'

class RpcServer {
  constructor (methods) {
    this.methods = methods
    this.listen()
  }

  listen () {
    self.addEventListener('message', this.handler.bind(this))
  }

  handler (e) {
    var { method, uid, data } = e.data
    if (this.methods[method]) {
      Promise.resolve(data).then(this.methods[method]).then(
        data => this.reply(uid, method, data),
        error => this.throw(uid, String(error))
      )
    } else {
      this.throw(uid, `Unknown RPC method "${method}"`)
    }
  }

  reply (uid, method, data) {
    var transferables = peekTransferables(data)
    self.postMessage({ uid, method, data }, transferables)
  }

  throw (uid, error) {
    self.postMessage({ uid, error })
  }

  emit (eventName, data) {
    self.postMessage({
      eventName,
      data
    })
  }
}

export default RpcServer
