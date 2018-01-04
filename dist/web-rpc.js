var Emitter = function Emitter () {
  this.events = Object.create(null);
};

Emitter.prototype.on = function on (event, listener) {
  var listeners = this.events[event];

  if (!listeners) {
    listeners = [];
    this.events[event] = listeners;
  }

  listeners.push(listener);
};

Emitter.prototype.off = function off (event, listener) {
  var listeners = this.events[event];

  if (listeners) {
    var idx = listeners.indexOf(listener);
    if (idx !== -1) {
      listeners.splice(idx, 1);
    }
  }
};

Emitter.prototype.emit = function emit (event, data) {
  var listeners = this.events[event];

  if (listeners) {
    for (var i = 0; i < listeners.length; i++) {
      listeners[i](data);
    }
  }
};

var crypto = window.crypto || window.msCrypto;
var arr = new Uint8Array(1);

function isObject (object) {
  return Object(object) === object
}

function isTransferable (object) {
  return object instanceof ArrayBuffer
}

function peekTransferables (data) {
  var result = [];
  if (isTransferable(data)) {
    result.push(data);
  } else if (isObject(data)) {
    for (var i in data) {
      if (isTransferable(data[i])) {
        result.push(data[i]);
      }
    }
  }
  return result
}

// https://github.com/Chalarangelo/30-seconds-of-code#uuidgeneratorbrowser
function uuid () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, function (c) { return (c ^ (crypto.getRandomValues(arr)[0] & (15 >> (c / 4)))).toString(16); }
  )
}

var RpcClient = (function (EventEmitter$$1) {
  function RpcClient (ref) {
    var workers = ref.workers;

    EventEmitter$$1.call(this);
    this.workers = [].concat( workers );
    this.idx = 0;
    this.calls = {};
    this.timeouts = {};
    this.errors = {};
    this.handler = this.handler.bind(this);
    this.listen();
  }

  if ( EventEmitter$$1 ) RpcClient.__proto__ = EventEmitter$$1;
  RpcClient.prototype = Object.create( EventEmitter$$1 && EventEmitter$$1.prototype );
  RpcClient.prototype.constructor = RpcClient;

  RpcClient.prototype.listen = function listen () {
    var this$1 = this;

    this.workers.forEach(function (worker) { return worker.addEventListener('message', this$1.handler); });
  };

  RpcClient.prototype.handler = function handler (e) {
    var ref = e.data;
    var error = ref.error;
    var method = ref.method;
    var eventName = ref.eventName;
    var data = ref.data;
    var uid = ref.uid;
    if (error) {
      this.reject(uid, error);
    }
    if (method) {
      this.resolve(uid, data);
    }
    if (eventName) {
      this.emit(eventName, data);
    }
  };

  RpcClient.prototype.reject = function reject (uid, error) {
    if (this.errors[uid]) {
      this.errors[uid](new Error(error));
      this.clear(uid);
    }
  };

  RpcClient.prototype.resolve = function resolve (uid, data) {
    if (this.calls[uid]) {
      this.calls[uid](data);
      this.clear(uid);
    }
  };

  RpcClient.prototype.clear = function clear (uid) {
    clearTimeout(this.timeouts[uid]);
    delete this.timeouts[uid];
    delete this.calls[uid];
    delete this.errors[uid];
  };

  RpcClient.prototype.call = function call (method, data, ref) {
    var this$1 = this;
    if ( ref === void 0 ) ref = {};
    var timeout = ref.timeout; if ( timeout === void 0 ) timeout = 2000;

    var uid = uuid();
    var transferables = peekTransferables(data);
    this.workers[this.idx].postMessage({ method: method, uid: uid, data: data }, transferables);
    this.idx = ++this.idx % this.workers.length; // round robin
    return new Promise(function (resolve, reject) {
      this$1.timeouts[uid] = setTimeout(function () { return this$1.reject(("RPC timeout exceeded for '" + method + "' call")); }, timeout);
      this$1.calls[uid] = resolve;
    })
  };

  return RpcClient;
}(Emitter));

/* eslint-env serviceworker */
var RpcServer = function RpcServer (methods) {
  this.methods = methods;
  this.listen();
};

RpcServer.prototype.listen = function listen () {
  self.addEventListener('message', this.handler.bind(this));
};

RpcServer.prototype.handler = function handler (e) {
    var this$1 = this;

  var ref = e.data;
    var method = ref.method;
    var uid = ref.uid;
    var data = ref.data;
  if (this.methods[method]) {
    Promise.all([this.methods[method](data)]).then(
      function (data) { return this$1.reply(uid, method, data); },
      function (error) { return this$1.throw(uid, error); }
    );
  } else {
    this.throw(uid, ("Unknown RPC method: " + method));
  }
};

RpcServer.prototype.reply = function reply (uid, method, data) {
  var transferables = peekTransferables(data);
  self.postMessage({ uid: uid, method: method, data: data }, transferables);
};

RpcServer.prototype.throw = function throw$1 (uid, error) {
  self.postMessage({ uid: uid, error: error });
};

RpcServer.prototype.emit = function emit (eventName, data) {
  self.postMessage({
    eventName: eventName,
    data: data
  });
};

var index = {
  Client: RpcClient,
  Server: RpcServer
};

export default index;
