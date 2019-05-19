'use strict';

/**
 * @callback listener
 * @param {*} data Any data could be passed to event listener
 */

var Emitter = function Emitter () {
  this.events = Object.create(null);
};

/**
 * Add listener to event. No context provided, use Function.prototype.bind(), arrow function or closure instead.
 * @param{string} event  Event name
 * @param{listener} listener Event listener
 * @return {Emitter}         Return self
 * @example
 *
 * function listener (data) {
 *console.log(data)
 * }
 *
 * emitter.on('event', listener)
 */
Emitter.prototype.on = function on (event, listener) {
  var listeners = this.events[event];

  if (!listeners) {
    listeners = [];
    this.events[event] = listeners;
  }

  listeners.push(listener);

  return this
};

/**
 * Remove listener from event.
 * @param{string} event  Event name
 * @param{listener} listener Event listener
 * @return {Emitter}         Return self
 * @example
 *
 * emitter.off('event', listener)
 */
Emitter.prototype.off = function off (event, listener) {
  var listeners = this.events[event];

  if (listeners) {
    var idx = listeners.indexOf(listener);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  }

  return this
};

/**
 * Trigger an event. Multiple arguments not supported, use destructuring instead.
 * @param{string}event Event name
 * @param{*}     dataEvent data
 * @return {Emitter}     Return self
 * @example
 *
 * emitter.emit('event', { foo: 'bar' })
 */
Emitter.prototype.emit = function emit (event, data) {
  var listeners = this.events[event];

  if (listeners) {
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](data);
    }
  }

  return this
};

/**
 * Ensure that passed value is object
 * @param  {*}       object Value to check
 * @return {boolean}        Check result
 */
function isObject (object) {
  return Object(object) === object
}

/**
 * Ensure that passed value could be transfer
 * @param  {*}       object Value to check
 * @return {boolean}        Check result
 */
function isTransferable (object) {
  try {
    return object instanceof ArrayBuffer
      || object instanceof ImageBitmap
      || object instanceof OffscreenCanvas
      || object instanceof MessagePort
  } catch(error) {
    return false
  }
}

/**
 * Recursively peek transferables from passed data
 * @param  {*}             data        Data source
 * @param  {Array}         [result=[]] Dist array
 * @return {ArrayBuffer[]}             List of transferables objects
 */
function peekTransferables (data, result) {
  if ( result === void 0 ) result = [];

  if (isTransferable(data)) {
    result.push(data);
  } else if (isObject(data)) {
    for (var i in data) {
      peekTransferables(data[i], result);
    }
  }
  return result
}

/**
 * @return {string} Uniq uid
 */
function uuid () {
  return Math.floor((1 + Math.random()) * 1e10).toString(16)
}

var RpcClient = (function (EventEmitter) {
  function RpcClient (ref) {
    var workers = ref.workers;

    EventEmitter.call(this);
    this.workers = [].concat( workers );
    this.idx = 0;
    this.calls = {};
    this.timeouts = {};
    this.errors = {};
    this.handler = this.handler.bind(this);
    this.catch = this.catch.bind(this);
    this.init();
  }

  if ( EventEmitter ) RpcClient.__proto__ = EventEmitter;
  RpcClient.prototype = Object.create( EventEmitter && EventEmitter.prototype );
  RpcClient.prototype.constructor = RpcClient;

  /**
   * Subscribtion to web workers events
   * @protected
   */
  RpcClient.prototype.init = function init () {
    this.workers.forEach(this.listen, this);
  };

  /**
   * Subsrciption to exact worker
   * @param {WebWorker} worker Server worker
   * @proteced
   */
  RpcClient.prototype.listen = function listen (worker) {
    worker.addEventListener('message', this.handler);
    worker.addEventListener('error', this.catch);
  };

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
  RpcClient.prototype.handler = function handler (e) {
    var ref = e.data;
    var uid = ref.uid;
    var error = ref.error;
    var method = ref.method;
    var eventName = ref.eventName;
    var data = ref.data;
    if (error) {
      this.reject(uid, error);
    } else if (method) {
      this.resolve(uid, data);
    } else if (eventName) {
      this.emit(eventName, data);
    }
  };

  /**
   * Error handler
   * https://www.nczonline.net/blog/2009/08/25/web-workers-errors-and-debugging/
   * @param  {string} options.message  Error message
   * @param  {number} options.lineno   Line number
   * @param  {string} options.filename Filename
   * @protected
   */
  RpcClient.prototype.catch = function catch$1 (ref) {
    var message = ref.message;
    var lineno = ref.lineno;
    var filename = ref.filename;

    this.emit('error', {
      message: message,
      lineno: lineno,
      filename: filename
    });
  };

  /**
   * Handle remote procedure call error
   * @param {string} uid   Remote call uid
   * @param {strint} error Error message
   * @protected
   */
  RpcClient.prototype.reject = function reject (uid, error) {
    if (this.errors[uid]) {
      this.errors[uid](new Error(error));
      this.clear(uid);
    }
  };

  /**
   * Handle remote procedure call response
   * @param {string} uid  Remote call uid
   * @param {*}      data Response data
   * @protected
   */
  RpcClient.prototype.resolve = function resolve (uid, data) {
    if (this.calls[uid]) {
      this.calls[uid](data);
      this.clear(uid);
    }
  };

  /**
   * Clear inner references to remote call
   * @param {string} uid Remote call uid
   * @protected
   */
  RpcClient.prototype.clear = function clear (uid) {
    clearTimeout(this.timeouts[uid]);
    delete this.timeouts[uid];
    delete this.calls[uid];
    delete this.errors[uid];
  };

  /**
   * Remote procedure call. Only ArrayBuffers will be transferred automatically (not TypedArrays).
   * Error would be thrown, if:
   * - it happened during procedure
   * - you try to call an unexisted procedure
   * - procedure execution takes more than timeout
   * @param  {string}     method                 Remote procedure name
   * @param  {*}          data                   Request data
   * @param  {Object}     [options]              Options
   * @param  {number}     [options.timeout=2000] Wait timeout
   * @return {Promise<*>}                        Remote procedure promise
   */
  RpcClient.prototype.call = function call (method, data, ref) {
    var this$1 = this;
    if ( ref === void 0 ) ref = {};
    var timeout = ref.timeout; if ( timeout === void 0 ) timeout = 2000;

    var uid = uuid();
    var transferables = peekTransferables(data);
    return new Promise(function (resolve, reject) {
      this$1.timeouts[uid] = setTimeout(function () { return this$1.reject(uid, ("Timeout exceeded for RPC method \"" + method + "\"")); }, timeout);
      this$1.calls[uid] = resolve;
      this$1.errors[uid] = reject;
      this$1.workers[this$1.idx].postMessage({ method: method, uid: uid, data: data }, transferables);
      this$1.idx = ++this$1.idx % this$1.workers.length; // round robin
    })
  };

  return RpcClient;
}(Emitter));

/* eslint-env serviceworker */

/**
 * @callback Procedure
 * @param  {*}           data Any data
 * @return {(Promise|*)}
 */

var RpcServer = function RpcServer (methods) {
  this.methods = methods;
  this.listen();
};

/**
 * Subscribtion to "message" events
 * @protected
 */
RpcServer.prototype.listen = function listen () {
  self.addEventListener('message', this.handler.bind(this));
};

/**
 * Handle "message" events, invoke remote procedure if it possible
 * @param {Event}e           Message event object
 * @param {Object} e.data      Event data
 * @param {string} e.data.method Procedure name
 * @param {number} e.data.uid  Unique id of rpc call
 * @param {*}    e.data.data Procedure params
 * @protected
 */
RpcServer.prototype.handler = function handler (e) {
    var this$1 = this;

  var ref = e.data;
    var method = ref.method;
    var uid = ref.uid;
    var data = ref.data;
  if (this.methods[method]) {
    Promise.resolve(data).then(this.methods[method]).then(
      function (data) { return this$1.reply(uid, method, data); },
      function (error) { return this$1.throw(uid, String(error)); }
    );
  } else {
    this.throw(uid, ("Unknown RPC method \"" + method + "\""));
  }
};

/**
 * Reply to remote call
 * @param {number} uid  Unique id of rpc call
 * @param {string} method Procedure name
 * @param {*}    data Call result, could be any data
 * @protected
 */
RpcServer.prototype.reply = function reply (uid, method, data) {
  var transferables = peekTransferables(data);
  self.postMessage({ uid: uid, method: method, data: data }, transferables);
};

/**
 * Throw error
 * @param {number} uid Unique id of rpc call
 * @param {string} error Error description
 * @protected
 */
RpcServer.prototype.throw = function throw$1 (uid, error) {
  self.postMessage({ uid: uid, error: error });
};

/**
 * Trigger server event
 * Only ArrayBuffers will be transferred automatically (not TypedArrays).
 * @param {string} eventName Event name
 * @param {*}    data    Any data
 * @example
 *
 * setInterval(() => {
 * server.emit('update', Date.now())
 * }, 50)
 */
RpcServer.prototype.emit = function emit (eventName, data) {
  var transferables = peekTransferables(data);

  self.postMessage({ eventName: eventName, data: data }, transferables);
};

var index = {
  Client: RpcClient,
  Server: RpcServer
}

module.exports = index;
