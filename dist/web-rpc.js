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

var RpcClient = function RpcClient (ref) {
  var worker = ref.worker;

  this.worker = worker;
  this.events = {};
  this.calls = {};
  this.timeouts = {};
  this.listen();
};

RpcClient.prototype.listen = function listen () {
  this.worker.addEventListener('message', this.handler.bind(this));
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
    this.trigger(eventName, data);
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

RpcClient.prototype.trigger = function trigger (eventName, data) {
  var handlers = this.events[eventName] || [];
  for (var i = 0; i < handlers.length; i++) {
    handlers[i](data);
  }
};

RpcClient.prototype.call = function call (method, data, ref) {
    var this$1 = this;
    if ( ref === void 0 ) ref = {};
    var timeout = ref.timeout; if ( timeout === void 0 ) timeout = 2000;

  var uid = guid();
  var transferables = peekTransferables(data);
  this.worker.postMessage({ method: method, uid: uid, data: data }, transferables);
  return new Promise(function (resolve, reject) {
    this$1.timeouts[uid] = setTimeout(function () { return reject(new Error(("RPC timeout exceeded for '" + method + "' call"))); }, timeout);
    this$1.calls[uid] = resolve;
  })
};

RpcClient.prototype.on = function on (eventName, handler) {
  var handlers = this.events[eventName] || [];(this.events[eventName] = handlers).push(handler);
};

RpcClient.prototype.off = function off (eventName, handler) {
  var handlers = this.events[eventName] || [];
  var idx = handlers.indexOf(handler);
  if (idx !== -1) {
    this.events[eventName].splice(idx, 1);
  }
};

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
