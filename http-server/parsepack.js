'use strict'
const fs = require('fs')
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
  return [
    null,
    'commit',
    'tree',
    'blob',
    'tag',
    'ofs-delta',
    'ref-delta',
  ][typebits]
}

function readObjectLength (byte) {
  // Grab the last four bits of the first byte.
  let lastFour = byte & 0b1111
  let len = 0b0
  while (isolateMSB(byte)) {
    byte = read(1, 'decimal')
    // shift digits left by 7, copy last 7 digits from byte
    len = (len << 7) | discardMSB(byte)
  }
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
for (var i = 0; i < objects; i++) {
// for (var i = 0; i < 1; i++) {
  let b = read(1, 'decimal')
  let t = objectType(b)
  echo(`  type: ${t}\n`)
  let l = readObjectLength(b)
  echo(`  original length: ${l}\n`)
  if (t === 'ref-delta') {
    echo(`  base sha: ${read(20, 'hex')}\n`)
  } else if (t === 'ofs-delta') {
    b = read(1, 'decimal')
    echo(`  base offset: ${readObjectLength(b)}\n`)
  }
  let a = idx
  let blob = readZlibBlob()
  echo(`  decompressed length: ${blob.length}`)
  echo(`  compressed length: ${idx - a}`)
  echo(Buffer.from(blob).toString('utf8'))
}
echo('Checksum:\n')
let hash = crypto.createHash('sha1')
hash.update(buffer.slice(0, idx))
let digest = hash.digest('hex')
echo(`  20 bytes (SHA-1): ${read(20, 'hex')}\n`)
echo(`  computed SHA-1: ${digest}\n`)