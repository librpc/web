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
    this.catch = this.catch.bind(this)
    this.init()
  }

  /**
   * Subscribtion to web workers events
   * @protected
   */
  init () {
    this.workers.forEach(this.listen, this)
  }

  /**
   * Subsrciption to exact worker
   * @param {WebWorker} worker Server worker
   * @proteced
   */
  listen (worker) {
    worker.addEventListener('message', this.handler)
    worker.addEventListener('error', this.catch)
  }

  /**
   * Message handler
   * @param {Event}  e               Event object
   * @param {Object} e.data          Message event data
   * @param {number} e.data.uid      Remote call uid
   * @param {string} [e.data.error]  Error discription
   * @param {string} [e.data.method] Remote procedure name
   * @param {string} [e.data.event]  Server event name
   * @param {*}      [e.data.data]   Procedure result or event data
   * @protected
   */
  handler (e) {
    var { uid, error, method, eventName, data } = e.data
    if (error) {
      this.reject(uid, error)
    } else if (method) {
      this.resolve(uid, data)
    } else if (eventName) {
      this.emit(eventName, data)
    }
  }

  /**
   * Error handler
   * https://www.nczonline.net/blog/2009/08/25/web-workers-errors-and-debugging/
   * @param  {string} options.message  Error message
   * @param  {number} options.lineno   Line number
   * @param  {string} options.filename Filename
   * @protected
   */
  catch ({ message, lineno, filename }) {
    this.emit('error', {
      message,
      lineno,
      filename
    })
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
    return new Promise((resolve, reject) => {
      this.timeouts[uid] = setTimeout(() => this.reject(uid, `Timeout exceeded for RPC method "${method}"`), timeout)
      this.calls[uid] = resolve
      this.errors[uid] = reject
      this.workers[this.idx].postMessage({ method, uid, data }, transferables)
      this.idx = ++this.idx % this.workers.length // round robin
    })
  }
}

export default RpcClient
