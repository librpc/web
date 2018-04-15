<h1 align="center">Promise-based RPC client and server for web workers</h1>
<p align="center">
  <a href="https://www.npmjs.com/package/@librpc/web" target="_blank">
    <img src="https://img.shields.io/npm/v/@librpc/web.svg" alt="NPM version" target="_blank"></img>
  </a>
  <a href="https://travis-ci.org/librpc/web" target="_blank">
    <img src="https://travis-ci.org/librpc/web.svg?branch=master" alt="Build Status" target="_blank"></img>
  </a>
  <a href='https://coveralls.io/github/librpc/web?branch=master'>
    <img src='https://coveralls.io/repos/github/librpc/web/badge.svg?branch=master' alt='Coverage Status' />
  </a>
  <a href="https://github.com/feross/standard" target="_blank">
    <img src="https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat" alt="js-standard-style"/>
  </a>
</p>

## Table of Contents

- [Features](#features)
- [Install](#install)
- [Usage](#usage)
- [API](#api)
- [Development](#development)

## Features

- Promise-based API as easy as possible
- Load balancing with round robin strategy
- Transferables support
- Server events
- Error handling
- High performance

## Install

```
npm install --save @librpc/web
```

or download [dev](https://unpkg.com/@librpc/web/dist/web-rpc.umd.js) or [prod](https://unpkg.com/@librpc/web/dist/web-rpc.min.js) version

## Usage

```js
// server.js
import { Server as RpcServer } from '@librpc/web'

function wait (time) {
  return new Promise(resolve => setTimeout(resolve, time))
}

self.rpcServer = new RpcServer({
  add ({ x, y }) { return x + y },
  task () { return wait(1000) },
  error () { return err },
  transfer (buffer) { return { buffer }}
})
```

```js
// client.js
import { Client as RpcClient } from '@librpc/web'

var worker = new window.Worker('server.js')

var rpcClient = new RpcClient({ workers: [worker] })

rpcClient.call('add', { x: 1, y: 1})
  .then(res => console.log(res)) // 2

rpcClient.call('length')
  .catch(err => console.log(err)) // Unknown RPC method "length"

rpcClient.call('task', null, { timeout: 100 })
  .catch(err => console.log(err)) // Timeout exceeded for RPC method "task"

rpcClient.call('error')
  .catch(err => console.log(err)) // ReferenceError: err is not defined

rpcClient.call('transfer', new ArrayBuffer(0xff))
  .then(res => console.log(res.buffer)) // ArrayBuffer(255)
```

## API

### WebRPC.Server

#### `#constructor(methods: { [string]: (*) => Promise<*> | * })`

```js
var server = new RpcServer({
  add ({ x, y }) { return x + y },
  sub ({ x, y }) { return x - y },
  mul ({ x, y }) { return x * y },
  div ({ x, y }) { return x / y },
  pow ({ x, y }) { return x ** y }
})
```

Every passed method becomes remote procedure. It can return Promise if it is needed. Only ArrayBuffers will be transferred automatically (not TypedArrays). Errors thrown by procedures would be handled by server.

#### `#emit(eventName: string, data: *)`

```js
setInterval(() => {
  server.emit('update', Date.now())
}, 50)
```

Trigger server event.

### WebRPC.Client

#### `#constructor(options: { workers: Array<Worker> })`

```js
var worker = new window.Worker('server.js')
var client = new RpcClient({ workers: [worker] })
```

Client could be connected to several workers for better CPU utilization. Requests are sent to an exact worker by round robin algorithm.

#### `#call(method: string, data: *, { timeout = 2000 } = {}): Promise<*>`

```js
client.call('pow', { x: 2, y: 10 })
  .then(result => console.log(result))
```

Remote procedure call. Only ArrayBuffers will be transferred automatically (not TypedArrays).

Error would be thrown, if:
- it happened during procedure
- you try to call an unexisted procedure
- procedure execution takes more than `timeout`

#### `#on(eventName: string, listener: (*) => void)`

```js
function listener (data) { console.log(data) }
client.on('update', listener)
```

Start listen to server events.

#### `#off(eventName: string, listener: (*) => void)`

```js
client.off('update', listener)
```

Stop listen to server events.

## Development

Command | Description
------- | -----------
`npm run check` | Check standard code style by [snazzy](https://www.npmjs.com/package/snazzy)
`npm run build` | Wrap source code in [UMD](https://github.com/umdjs/umd) by [rollup](http://rollupjs.org/)
`npm run test` | Run tests by [tape](https://github.com/substack/tape) and compute code coverage by [nyc](https://github.com/bcoe/nyc)
`npm run min` | Minify code by [UglifyJS2](https://github.com/mishoo/UglifyJS2)
