/* eslint-env serviceworker */
import { peekTransferables } from './utils.js'

/**
 * @callback Procedure
 * @param  {*}           data Any data
 * @return {(Promise|*)}
 */

class RpcServer {
  /**
   * Every passed method becomes remote procedure.
   * It can return Promise if it is needed.
   * Only ArrayBuffers will be transferred automatically (not TypedArrays).
   * Errors thrown by procedures would be handled by server.
   * @param {Object.<string, Procedure>} methods Dictionary of remote procedures
   * @example
   *
   * var server = new RpcServer({
   *   add ({ x, y }) { return x + y },
   *   sub ({ x, y }) { return x - y },
   *   mul ({ x, y }) { return x * y },
   *   div ({ x, y }) { return x / y },
   *   pow ({ x, y }) { return x ** y }
   * })
   */
  constructor (methods) {
    this.methods = methods
    this.listen()
  }

  /**
   * Subscribtion to "message" events
   * @protected
   */
  listen () {
    self.addEventListener('message', this.handler.bind(this))
  }

  /**
   * Handle "message" events, invoke remote procedure if it possible
   * @param {Event}  e             Message event object
   * @param {Object} e.data        Event data
   * @param {string} e.data.method Procedure name
   * @param {number} e.data.uid    Unique id of rpc call
   * @param {*}      e.data.data   Procedure params
   * @protected
   */
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

  /**
   * Replay to remote call
   * @param {number} uid    Unique id of rpc call
   * @param {string} method Procedure name
   * @param {*}      data   Call result, could be any data
   * @protected
   */
  reply (uid, method, data) {
    var transferables = peekTransferables(data)
    self.postMessage({ uid, method, data }, transferables)
  }

  /**
   * Throw error
   * @param {number} uid   Unique id of rpc call
   * @param {string} error Error description
   * @protected
   */
  throw (uid, error) {
    self.postMessage({ uid, error })
  }

  /**
   * Trigger server event
   * @param {string} eventName Event name
   * @param {*}      data      Any data
   * @example
   *
   * setInterval(() => {
   *   server.emit('update', Date.now())
   * }, 50)
   */
  emit (eventName, data) {
    self.postMessage({
      eventName,
      data
    })
  }
}

export default RpcServer
