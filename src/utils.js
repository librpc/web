export function isObject (object) {
  return Object(object) === object
}

export function isTransferable (object) {
  return object instanceof ArrayBuffer
}

export function peekTransferables (data, result = []) {
  if (isTransferable(data)) {
    result.push(data)
  } else if (isObject(data)) {
    for (var i in data) {
      peekTransferables(data[i], result)
    }
  }
  return result
}

export function uuid () {
  return Math.floor((1 + Math.random()) * 1e10).toString(16)
}
