'use strict'
const shasum = require('shasum')
const pgp = require('./pgp')

function formatTimezoneOffset (minutes) {
  let sign = Math.sign(minutes) || 1
  minutes = Math.abs(minutes)
  let hours = Math.floor(minutes / 60)
  minutes -= hours * 60
  hours = String(hours)
  minutes = String(minutes)
  if (hours.length < 2) hours = '0' + hours
  if (minutes.length < 2) minutes = '0' + minutes
  return (sign === -1 ? '+' : '-') + hours + minutes
}

function parseTimezoneOffset (offset) {
  let [, sign, hours, minutes] = offset.match(/(\+|-)(\d\d)(\d\d)/)
  minutes = (sign === '-' ? 1 : -1) * Number(hours) * 60 + Number(minutes)
  return minutes
}

function parseAuthor (author) {
  let [, name, email, timestamp, offset] = author.match(/^(.*) <(.*)> (.*) (.*)$/)
  return {
    name: name,
    email: email,
    timestamp: Number(timestamp),
    timezoneOffset: parseTimezoneOffset(offset)
  }
}

function normalize (str) {
  // remove all <CR>
  str = str.replace(/\r/g, '')
  // no extra newlines up front
  str = str.replace(/^\n+/, '')
  // and a single newline at the end
  str = str.replace(/\n+$/, '') + '\n'
  return str
}

function indent (str) {
  return str.trim().split('\n').map(x => ' ' + x).join('\n') + '\n'
}

function outdent (str) {
  return str.split('\n').map(x => x.replace(/^ /, '')).join('\n')
}

// TODO: Make all functions have static async signature?

export class GitCommit {
  static fromPayloadSignature ({payload, signature}) {
    let headers = GitCommit.headers(payload)
    let message = GitCommit.message(payload)
    let commit = normalize(headers + '\ngpgsig' + indent(signature) + '\n' + message)
    return commit
  }

  static wrapObject (commit) {
    return `commit ${commit.length}\0${commit}`
  }

  static sha (commit) {
    return shasum(GitCommit.wrapObject(commit))
  }

  static headers (commit) {
    return commit.slice(0, commit.indexOf('\n\n'))
  }

  static message (commit) {
    return commit.slice(commit.indexOf('\n\n') + 2)
  }

  static parseHeaders (commit) {
    if (commit === null) return null
    let headers = GitCommit.headers(commit).split('\n')
    let hs = []
    for (let h of headers) {
      if (h[0] === ' ') {
        // combine with previous header (without space indent)
        hs[hs.length - 1] += '\n' + h.slice(1)
      } else {
        hs.push(h)
      }
    }
    let obj = {}
    for (let h of hs) {
      let key = h.slice(0, h.indexOf(' '))
      let value = h.slice(h.indexOf(' ') + 1)
      obj[key] = value
    }
    obj.parent = (obj.parent) ? obj.parent.split(' ') : []
    if (obj.author) {
      obj.author = parseAuthor(obj.author)
    }
    if (obj.committer) {
      obj.committer = parseAuthor(obj.committer)
    }
    return obj
  }

  static renderHeaders (obj) {
    let headers = ''
    if (obj.tree) {
      headers += `tree ${obj.tree}\n`
    } else {
      headers += `tree 4b825dc642cb6eb9a060e54bf8d69288fbee4904\n` // the null tree
    }
    if (obj.parent) {
      headers += 'parent'
      for (let p of obj.parent) {
        headers += ' ' + p
      }
      headers += '\n'
    }
    let author = obj.author
    headers += `author ${author.name} <${author.email}> ${author.timestamp} ${formatTimezoneOffset(author.timezoneOffset)}\n`
    let committer = obj.committer || obj.author
    headers += `committer ${committer.name} <${committer.email}> ${committer.timestamp} ${formatTimezoneOffset(committer.timezoneOffset)}\n`
    if (obj.gpgsig) {
      headers += 'gpgsig' + indent(obj.gpgsig)
    }
    return headers
  }

  static parse (commit) {
    if (commit === null) return null
    return {
      headers: GitCommit.parseHeaders(commit),
      message: GitCommit.message(commit),
      sha: GitCommit.sha(commit)
    }
  }

  static render (obj) {
    return GitCommit.renderHeaders(obj) + '\n' + obj.message
  }

  static withoutSignature (commit) {
    commit = normalize(commit)
    if (commit.indexOf('\ngpgsig') === -1) return commit
    let headers = commit.slice(0, commit.indexOf('\ngpgsig'))
    let message = commit.slice(commit.indexOf('-----END PGP SIGNATURE-----\n') + '-----END PGP SIGNATURE-----\n'.length)
    return normalize(headers + '\n' + message)
  }

  static isolateSignature (commit) {
    let signature = commit.slice(
      commit.indexOf('-----BEGIN PGP SIGNATURE-----'),
      commit.indexOf('-----END PGP SIGNATURE-----') + '-----END PGP SIGNATURE-----'.length)
    return outdent(signature)
  }

  static async verifySignature (commit) {
    let header = GitCommit.parseHeaders(commit)
    let verified = await pgp.verifyDetachedSignature(header.committer.email, GitCommit.withoutSignature(commit), GitCommit.isolateSignature(commit))
    return verified
  }

  static async addSignature (commit) {
    commit = GitCommit.withoutSignature(commit)
    let headers = GitCommit.headers(commit)
    let message = GitCommit.message(commit)
    let header = GitCommit.parseHeaders(commit)
    let signedmsg = await pgp.createBinaryDetachedSignature(header.committer.email, commit)
    // renormalize the line endings to the one true line-ending
    signedmsg = normalize(signedmsg)
    let signedCommit = headers + '\n' + 'gpgsig' + indent(signedmsg) + '\n' + message
    console.log(signedCommit)
    return signedCommit
  }
}
