var test = require('tape')
var tapDiff = require('tap-diff')
var EventEmitter = require('events')

test.createStream()
  .pipe(tapDiff())
  .pipe(process.stdout)

var WebRPC = require('../dist/web-rpc.cjs.js')

class EventTarget extends EventEmitter {
  addEventListener (event, listener) {
    this.on(event, listener)
  }
}

global.self = new EventTarget()
global.self.postMessage = function (data) {
  global.worker.emit('message', { data })
}

global.worker = new EventTarget()
global.worker.postMessage = function (data) {
  global.self.emit('message', { data })
}

function wait (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

var server = new WebRPC.Server({
  add ({ x, y }) { return x + y },
  task () { return wait(1000).then(() => 'done') },
  error () { return err }, // eslint-disable-line
  transfer (buffer) { return { buffer } }
})

var client = new WebRPC.Client({
  workers: [global.worker]
})

test('RpcServer.constructor()', t => {
  t.ok(server instanceof WebRPC.Server, 'should create new RPC server')
  t.deepEqual(Object.keys(server.methods), ['add', 'task', 'error', 'transfer'], 'should have passed methods')
  t.deepEqual(global.self.eventNames(), ['message'], 'should listen "message" event')
  t.end()
})

test('RpcServer.emit()', t => {
  t.plan(1)
  function listener (data) {
    t.deepEqual(data, { foo: 'bar' }, 'should trigger RPC server event')
  }

  client.on('event', listener)
  server.emit('event', { foo: 'bar' })
  client.off('event', listener)
  server.emit('event', { foo: 'bar' })
})

test('RpcClient.constructor() should create new RPC client', t => {
  t.ok(client instanceof WebRPC.Client, 'should create new RPC client')
  t.equal(client.workers.length, 1, 'should have passed workers')
  t.deepEqual(global.worker.eventNames(), ['message', 'error'], 'should listen "message" and "error" event')
  global.worker.emit('error', { message: 'Some error', lineno: 42, filename: 'worker.js' })
  t.end()
})

test('RpcClient.call()', t => {
  t.plan(7)
  var result = client.call('add', { x: 1, y: 1 })
  t.ok(result.then, 'should return Promise')
  t.equal(client.idx, 0, 'should round robbin')
  result.then(res => t.equal(res, 2, 'should call RPC server method'))
  client.call('length').catch(err => {
    t.ok(err instanceof Error, 'should throw unknown methods error')
  })
  client.call('task', null, { timeout: 100 }).catch(err => {
    t.ok(err instanceof Error, 'should throw timeout exceeded error')
  })
  client.call('error').catch(err => {
    t.ok(err instanceof Error, 'should throw RPC server error')
  })
  var buffer = new ArrayBuffer(0xff)
  client.call('transfer', buffer).then(res => {
    t.equal(buffer, res.buffer, 'should support transferables i/o')
  })
})

test('client and server ignore non-rpc messages', t => {
  t.plan(2)

  global.self.postMessage({ oh: 'what' })
  t.ok(true, 'worker -> main should not throw')

  let threw = false
  global.self.addEventListener('message', ({data}) => {
      console.log(data)
      threw = true
  })
  global.worker.postMessage({ foo: 'bar' })
  t.ok(!threw, 'main -> worker should not throw')
})
