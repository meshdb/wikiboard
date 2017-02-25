'use strict'
// TIP: use GIT_CURL_VERBOSE to debug git
const fs = require('fs')
const buffer = fs.readFileSync('../.git/objects/pack/pack-7380fc6143b885338ea5b89de3a2d0f49aa106df.idx')
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
  if (enc == 'ascii') {
    return onespace(view.toString())
  } else if (enc === 'hex') {
    return twospace(view.toString('hex'))
  } else if (enc === 'decimal') {
    return parseInt(view.toString('hex'), 16)
  }
}

echo('Layer 0: Header\n')
echo(`  4 bytes (magic number): ${read(4, 'hex')}\n`)
echo(`  4 bytes (version): ${read(4, 'hex')}\n`)
echo('Layer 1: Fanout\n')
let total = 0
for (var i = 0; i < 256; i++) {
  total = read(4, 'decimal')
  echo(`  4 bytes (shas lte ${i.toString(16)}): ${total}\n`)
}
echo('Layer 2: SHAs\n')
for (var i = 0; i < total; i++) {
  echo(`  20 bytes (SHA): ${read(20, 'hex')}\n`)
}
echo('Layer 3: CRC\n')
for (var i = 0; i < total; i++) {
  echo(`  4 bytes (CRC): ${read(4, 'hex')}\n`)
}
echo('Layer 4: Packfile Offsets\n')
let layer5 = 0
for (var i = 0; i < total; i++) {
  let offset = read(4, 'decimal')
  // Check if the most-significant-bit (MSB) is set
  // Yes, >>> is a real operator in JavaScript: bitwise zero-fill right shift
  if (offset >>> 31) {
    layer5 += 1
    // Discard MSB
    offset = (offset << 1 >>> 1)
    echo(`  4 bytes (Layer 5 offset): ${offset}\n`)
  } else {
    echo(`  4 bytes (packfile offset): ${offset}\n`)
  }
}
if (layer5) {
  echo(`Layer 5: Offsets >2GB\n`)
  for (var i = 0; i < layer5; i++) {
    let offset = read(4, 'decimal')
    echo(`  4 bytes (layer5 offset): ${offset}\n`)
  }
}
echo('Layer 6: Checksums\n')
echo(`  20 bytes (packfile sha): ${read(20, 'hex')}\n`)
echo(`  20 bytes (idx sha): ${read(20, 'hex')}\n`)
