'use strict'
const createRangeStream = require('level-range')
const getStream = require('get-stream')

function unPrefix (prefix) {
  return function (entry) {
    entry.key = entry.key.slice(prefix.length)
    return entry
  }
}

module.exports = {
  prefix: function prefix (db, prefix) {
    return getStream.array(db.createReadStream({gt: prefix, lt: prefix + '\xFF'})).then(x => x.map(unPrefix(prefix)))
  },
  range: function range (db, start, end) {
    return getStream.array(db.createReadStream({gt: start, lt: end}))
  }
}