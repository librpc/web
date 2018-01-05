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

- Simple - [197 LOC](https://github.com/librpc/web/blob/master/dist/web-rpc.js#L197)
- Lightweight - [2.7 KB](https://github.com/librpc/web/blob/master/dist/web-rpc.min.js)
- Promise based easiest API as possible
- Load balancing with round robin strategy
- Error handling
- Transferables support
- High performance

## Install

## Usage

```js
// server.js
import { Server as RpcServer } from '@librpc/web'

self.rpcServer = new RpcServer({
  fib (n) {
    var a = 1
    var b = 0
    for (var i = n; i--;) {
      b = [a, a += b][0]
    }
    return b
  },

  fac (n) {
    var f = 1
    for (var i = 2; i <= n; i++) {
      f *= i
    }
    return f
  }
})
```

```js
// client.js
import { Client as RpcClient } from '@librpc/web'

var worker = new window.Worker('server.js')

var rpcClient = new RpcClient({ workers: [worker] })

var n = 100

rpcClient.call('fib', n)
  .then((result) => console.log(`Response fib(${n}) = ${result}`))
  
rpcClient.call('fac', n)
  .then((result) => console.log(`Response fac(${n}) = ${result}`))
```

## API

### WebRPC.Server

#### `#constructor(methods)`

```js
var server = new RpcServer({
  add ({ x, y }) { return x + y },
  sub ({ x, y }) { return x - y },
  mul ({ x, y }) { return x * y },
  div ({ x, y }) { return x / y },
  pow ({ x, y }) { return x ** y }
})
```

#### `#emit(eventName, data)`

```js
setInterval(() => {
  server.emit('update', Date.now())
}, 50)
```

### WebRPC.Client

#### `#constructor({ worker })`

```js
var worker = new window.Worker('server.js')
var client = new RpcClient({ worker })
```

#### `#call(method, data, { timeout = 2000 })`

```js
client.call('add', { x: 100, y: 100 })
  .then(result => console.log(result))
```

#### `#on(eventName, listener)`

```js
function listener (data) { console.log(data) }
client.on('update', listener)
```

#### `#off(eventName, listener)`

```js
client.off('update', listener)
```

## Development

Command | Description
------- | -----------
`npm run check` | Check standard code style by [snazzy](https://www.npmjs.com/package/snazzy)
`npm run build` | Wrap source code in [UMD](https://github.com/umdjs/umd) by [rollup](http://rollupjs.org/)
`npm run min` | Minify code by [UglifyJS2](https://github.com/mishoo/UglifyJS2)
