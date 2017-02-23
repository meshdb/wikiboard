'use strict'
const upath = require('upath')
const levelup = require('level-browserify')
const createRangeStream = require('level-range')
const getStream = require('get-stream')

function unPrefix (prefix) {
  return function (entry) {
    entry.key = entry.key.slice(prefix.length)
    return entry
  }
}

let dbpool = new Map()

module.exports = {
  db: function db (name) {
    if (!dbpool.has(name)) {
      dbpool.set(name, levelup(upath.join('.repos', name), {
        keyEncoding: 'utf8',
        valueEncoding: 'utf8'
      }))
    }
    return dbpool.get(name)
  },
  prefix: function prefix (db, prefix) {
    return getStream.array(db.createReadStream({gt: prefix, lt: prefix + '\xFF'})).then(x => x.map(unPrefix(prefix)))
  },
  range: function range (db, start, end) {
    return getStream.array(db.createReadStream({gt: start, lt: end}))
  }
}