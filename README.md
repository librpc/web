<h1 align="center">WRPC</h1>
<h4 align="center">Cross worker rpc server and client</h4>
<p align="center">
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

- Simple - [138 LOC](https://github.com/broadsw0rd/wrpc/blob/master/dist/wrpc.js#L138)
- Lightweight - [2 KB](https://github.com/broadsw0rd/wrpc/blob/master/dist/wrpc.min.js)
- Promise based
- Designed with performance in mind and tested with [IRHydra](http://mrale.ph/irhydra/2/)

## Install

## Usage

```js
// server.js
import { RpcServer } from 'wrpc'

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
import { RpcClient } from 'wrpc'

var worker = new window.Worker('server.js')

var rpcClient = new RpcClient({ worker })

var n = 100

rpcClient.call('fib', n)
  .then((result) => console.log(`Response fib(${n}) = ${result}`))
  
rpcClient.call('fac', n)
  .then((result) => console.log(`Response fac(${n}) = ${result}`))
```

## API

## Development

Command | Description
------- | -----------
`npm run check` | Check standard code style by [snazzy](https://www.npmjs.com/package/snazzy)
`npm run build` | Wrap source code in [UMD](https://github.com/umdjs/umd) by [rollup](http://rollupjs.org/)
`npm run min` | Minify code by [UglifyJS2](https://github.com/mishoo/UglifyJS2)
