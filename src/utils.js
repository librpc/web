var crypto = window.crypto || window.msCrypto
var arr = new Uint8Array(1)

export function isObject (object) {
  return Object(object) === object
}

export function isTransferable (object) {
  return object instanceof ArrayBuffer
}

export function peekTransferables (data) {
  var result = []
  if (isTransferable(data)) {
    result.push(data)
  } else if (isObject(data)) {
    for (var i in data) {
      if (isTransferable(data[i])) {
        result.push(data[i])
      }
    }
  }
  return result
}

// https://github.com/Chalarangelo/30-seconds-of-code#uuidgeneratorbrowser
export function uuid () {
  return ([1e7] + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, c =>
    (c ^ (crypto.getRandomValues(arr)[0] & (15 >> (c / 4)))).toString(16)
  )
}
