<h1 align="center">Promise based cross worker rpc client and server</h1>
<p align="center">
  <a href="https://travis-ci.org/librpc/web" target="_blank">
    <img src="https://travis-ci.org/librpc/web.svg?branch=master" alt="Build Status" target="_blank"></img>
  </a>
  <a href='https://coveralls.io/github/librpc/web?branch=master'>
    <img src='https://coveralls.io/repos/github/librpc/web/badge.svg?branch=master' alt='Coverage Status' />
  </a>
  <a href="https://www.bithound.io/github/librpc/web">
    <img src="https://www.bithound.io/github/librpc/web/badges/score.svg" alt="bitHound Overall Score">
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

- Promise based easiest API as possible
- Load balancing with round robin strategy
- Error handling
- Transferables support
- Server Events
- High performance

## Install

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

#### `#emit(eventName: string, data: *)`

```js
setInterval(() => {
  server.emit('update', Date.now())
}, 50)
```

### WebRPC.Client

#### `#constructor(options: { workers: Array<Worker> })`

```js
var worker = new window.Worker('server.js')
var client = new RpcClient({ workers: [worker] })
```

#### `#call(method: string, data: *, { timeout = 2000 } = {}): Promise<*>`

```js
client.call('pow', { x: 2, y: 10 })
  .then(result => console.log(result))
```

#### `#on(eventName: string, listener: (*) => void)`

```js
function listener (data) { console.log(data) }
client.on('update', listener)
```

#### `#off(eventName: string, listener: (*) => void)`

```js
client.off('update', listener)
```

## Development

Command | Description
------- | -----------
`npm run check` | Check standard code style by [snazzy](https://www.npmjs.com/package/snazzy)
`npm run build` | Wrap source code in [UMD](https://github.com/umdjs/umd) by [rollup](http://rollupjs.org/)
`npm run min` | Minify code by [UglifyJS2](https://github.com/mishoo/UglifyJS2)
