'use strict'
/* global TextEncoder */ // eslint-disable-line no-unused-vars
import shasum from 'shasum'
// const pgp = require('./pgp')
// const pako = require('pako')
import pify from 'pify'
import levelup from 'level-browserify'
import pad from 'pad'

const Helpers = require('./level-helpers')
import { GitCommit } from './GitCommit'

export class GitRepo {
  constructor (name) {
    let db = levelup(name, {
      keyEncoding: 'utf8',
      valueEncoding: 'utf8'
    })
    this.db = db
    window.db = db
    this.get = pify((key, cb) => db.get(key, cb))
    this.put = pify((key, value, cb) => db.put(key, value, cb))
    this.range = (start, end) => Helpers.range(db, start, end)
    this.prefix = (prefix) => Helpers.prefix(db, prefix)
  }

  async putObject (binaryString) {
    let sha = shasum(binaryString)
    await this.put(`:objects:${sha}`, binaryString)
    return sha
    // The binary option, should we ever need it.
    // // let uint8array = new TextEncoder('utf8').encode(binaryString)
    // // await this.put(`objects/${sha}`, uint8array, {valueEncoding: 'binary'})
  }
  
  async getObject (sha) {
    try {
      let raw = await this.get(`:objects:${sha}`)
      // Strip the object type & length
      return raw.replace(/^.+\0/, '')
    } catch (e) {
      if (e.notFound) return null
      throw e
    }
  }
  
  async putCommit (commit) {
    let headers = GitCommit.parseHeaders(commit)
    try {
      let sha = await this.putObject(GitCommit.wrapObject(commit))
      let timestamp = pad(10, headers.author.timestamp, '0')
      await this.put(`:time:${timestamp}:${sha}`, commit)
      return sha
    } catch (e) {
      throw (e)
    }
  }
    
  async putBranch (ref, sha) {
    return await this.put(`:refs:branches:${ref}`, sha)
  }
  
  async getBranch (ref) {
    try {
      return await this.get(`:refs:branches:${ref}`)
    } catch (err) {
      if (err.notFound) return null
      throw(err)
    }
  }

  
  // async getRoot (ref) {
  //   let {object} = await this.graph.getP({subject: ref, predicate: 'root'})
  //   return object
  // }
  //
  // async putRoot (ref, sha) {
  //   return await this.graph.put({subject: ref, predicate: 'root', object: sha})
  // }
  
  async putTag (ref, sha) {
    return await this.put(`:refs:tags:${ref}`, sha)
  }
 
  async getTag (ref) {
    try {
      return await this.get(`:refs:tags:${ref}`)
    } catch (err) {
      if (err.notFound) return null
      throw(err)
    }
  }

  async listBranches () {
    let results = await this.prefix(`:refs:branches:`)
    let pretty = results.map(x => x.key)
    return pretty
  }

  async listTags () {
    let results = await this.prefix(`:refs:tags:`)
    let pretty = results.map(x => x.key)
    return pretty
  }

  async getCommitsSinceTimestamp (timestamp) {
    let results = await this.range(`:time:${timestamp}`, `:time:~`)
    let pretty = results.map(x => GitCommit.parse(x.value))
    return pretty
  }

  // async listCommitsOnBranch (branch) {
  //   let results = await this.graph.getP({predicate: 'branch', subject: branch})
  //   let sha = results[0].object
  //   console.log('sha =', sha)
  //   let shas = await this.getFirstParentAncestors({sha})
  //   console.log('shas =', shas)
  //   let commits = await Promise.all(shas.map(sha => this.getObject(sha)))
  //   commits = commits.filter(x => x !== null)
  //   return commits
  // }
  // 
  // async getFirstParentAncestors ({sha, limit}) {
  //   limit = limit || 100
  //   let ancestors = [sha]
  //   while (limit-- > 0) {
  //     let parents = await this.graph.getP({object: sha, predicate: 'parent'})
  //     if (parents.length === 0) break
  //     sha = parents[0].subject
  //     ancestors.push(sha)
  //   }
  //   return ancestors
  // }
}
