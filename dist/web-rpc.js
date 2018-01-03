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

function guid () {
  return Math.floor((1 + Math.random()) * 1e6).toString(16)
}

var RpcClient = (function (EventEmitter$$1) {
  function RpcClient (ref) {
    var workers = ref.workers;

    EventEmitter$$1.call(this);
    this.workers = workers;
    this.idx = 0;
    this.calls = {};
    this.timeouts = {};
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
    var method = ref.method;
    var eventName = ref.eventName;
    var data = ref.data;
    var uid = ref.uid;
    if (method) {
      this.resolve(uid, data);
    }
    if (eventName) {
      this.emit(eventName, data);
    }
  };

  RpcClient.prototype.resolve = function resolve (uid, data) {
    if (this.calls[uid]) {
      clearTimeout(this.timeouts[uid]);
      this.calls[uid](data);
      delete this.timeouts[uid];
      delete this.calls[uid];
    }
  };

  RpcClient.prototype.call = function call (method, data, ref) {
    var this$1 = this;
    if ( ref === void 0 ) ref = {};
    var timeout = ref.timeout; if ( timeout === void 0 ) timeout = 2000;

    var uid = guid();
    var transferables = peekTransferables(data);
    this.idx = ++this.idx % this.workers.length; // round robin
    this.workers[this.idx].postMessage({ method: method, uid: uid, data: data }, transferables);
    return new Promise(function (resolve, reject) {
      this$1.timeouts[uid] = setTimeout(function () { return reject(new Error(("RPC timeout exceeded for '" + method + "' call"))); }, timeout);
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
  var ref = e.data;
    var method = ref.method;
    var uid = ref.uid;
    var data = ref.data;
  if (this.methods[method]) {
    Promise.all([method, uid, this.methods[method](data)]).then(this.reply);
  }
};

RpcServer.prototype.reply = function reply (ref) {
    var method = ref[0];
    var uid = ref[1];
    var data = ref[2];

  var transferables = peekTransferables(data);
  self.postMessage({ method: method, uid: uid, data: data }, transferables);
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
