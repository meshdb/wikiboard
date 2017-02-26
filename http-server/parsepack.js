'use strict'
const fs = require('fs')
const pad = require('pad')
const Inflate = require('pako').Inflate
const buffer = fs.readFileSync(process.argv[2])
const crypto = require('crypto')
let idx = 0

const echo = process.stdout.write.bind(process.stdout)

function onespace (str) {
  let result = ''
  let i = 0,
      l = str.length
  while (i < l) {
    result += str[i]
    i++
    if (i < l) result += ' '
  }
  return result
}

function twospace (str) {
  let result = ''
  let i = 0,
      l = str.length
  while (i < l) {
    result += str[i]
    i++
    if (i % 2 == 0 && i < l) result += ' '
  }
  return result
}

let read = function (size, enc) {
  let view = buffer.slice(idx, idx+size)
  idx += size
  if (enc === 'raw') {
    return view
  } else if (enc === 'ascii') {
    return onespace(view.toString())
  } else if (enc === 'hex') {
    return twospace(view.toString('hex'))
  } else if (enc === 'decimal') {
    return parseInt(view.toString('hex'), 16)
  }
}

const isolateMSB = (byte) => byte >>> 7
const discardMSB = (byte) => byte & 0b01111111

const PACKTYPE = {
  commit: 1,
  tree: 2,
  blob: 3,
  tag: 4,
  'ofs-delta': 6,
  'ref-delta': 7,
}

const objectType = (byte) => {
  // Grab the three bits that matter and discard the rest
  let typebits = (byte & 0b01110000) >>> 4
  return ({
    1: 'commit',
    2: 'tree',
    3: 'blob',
    4: 'tag',
    5: undefined,
    6: 'ofs-delta',
    7: 'ref-delta',
  })[typebits]
}

function readVarInt () {
  let byte = 0b0
  let len = 0b0
  let leftshift = 0
  do {
    // JS will automatically coerce this 64-bit floating point number
    // to an unsigned 32-bit integer when we do bit arithmetic.
    byte = read(1, 'decimal')
    // insert the last 7 digits from the byte into len
    // each iteration the starting point for the insertion is shifted by
    // 7 bits so we are writing to 'more significant bits' than the last iteration
    len = (discardMSB(byte) << leftshift) | len
    leftshift += 7
    // If the MSB is set that means there is more bytes in this number.
  } while (isolateMSB(byte))
  // believe it or not len is still a normal floating point number.
  return len
}

function readObjectLength (byte) {
  // Grab the last four bits of the first byte.
  let lastFour = byte & 0b1111
  // If there are no more bytes, we're done.
  if (!isolateMSB(byte)) return lastFour
  // Otherwise, read the remaining bytes of the number.
  let len = readVarInt()
  // shift digits left by 4, copy last 4 from first byte
  len = (len << 4) | lastFour
  return len
}

function readZlibBlob () {
  let inf = new Inflate()
  var b
  while (!inf.ended) {
    b = read(1, 'raw')
    inf.push(b, false)
    if (inf.err) {
      throw new Error(inf.msg)
    }
  }
  return inf.result
}

echo('Header:\n')
echo(`  4 bytes (PACK): ${read(4, 'ascii')}\n`)
echo(`  4 bytes (version): ${read(4, 'hex')}\n`)
let objects = read(4, 'decimal')
echo(`  4 bytes (number of objects): ${objects}\n`)
echo('Objects:\n')
let padLength = 1 + Math.floor(Math.log10(objects))
let padding = pad(padLength, ' ')
for (var i = 0; i < objects; i++) {
  let b = read(1, 'decimal')
  let t = objectType(b)
  echo(`  ${pad(padLength, i)}: type: ${t}\n`)
  let l = readObjectLength(b)
  echo(`  ${padding}  object length: ${l}\n`)
  if (t === 'ref-delta') {
    // reference delta
    echo(`  ${padding}  base sha: ${read(20, 'hex')}\n`)
  } else if (t === 'ofs-delta') {
    // offset delta
    echo(`  ${padding}  base offset: ${readVarInt()}\n`)
  }
  let a = idx
  let blob = readZlibBlob()
  echo(`  ${padding}  decompressed length: ${blob.length}\n`)
  echo(`  ${padding}  compressed length: ${idx - a}\n`)
}
echo('Checksum:\n')
let hash = crypto.createHash('sha1')
hash.update(buffer.slice(0, idx))
let digest = hash.digest('hex')
echo(`  20 bytes (SHA-1): ${read(20, 'hex')}\n`)
echo(`  (compare against) ${twospace(digest)}\n`)