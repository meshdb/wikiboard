'use strict'
/* global TextEncoder */ // eslint-disable-line no-unused-vars
import shasum from 'shasum'
// const pgp = require('./pgp')
// const pako = require('pako')
import pify from 'pify'
import pad from 'pad'

const Helpers = require('./level-helpers')
import { GitCommit } from './GitCommit'

let dbpool = {}

function db (name) {
  let db = Helpers.db(name)
  let wrapper = {
    get: pify((key, cb) => db.get(key, cb)),
    put: pify((key, value, cb) => db.put(key, value, cb)),
    range: (start, end) => Helpers.range(db, start, end),
    prefix: (prefix) => Helpers.prefix(db, prefix),
  }
  return wrapper
}

export class GitRepo {
  // TODO: validate objects
  static async put({repo, key, value}) {
    return db(repo).put(key, value)
  }
  
  static async putObject ({repo, binaryString}) {
    let sha = shasum(binaryString)
    await db(repo).put(`:objects:${sha}`, binaryString)
    return sha
    // The binary option, should we ever need it.
    // // let uint8array = new TextEncoder('utf8').encode(binaryString)
    // // await this.put(`objects/${sha}`, uint8array, {valueEncoding: 'binary'})
  }
  
  static async getObject ({repo, sha}) {
    try {
      let raw = await db(repo).get(`:objects:${sha}`)
      // Strip the object type & length
      return raw.replace(/^.+\0/, '')
    } catch (e) {
      if (e.notFound) return null
      throw e
    }
  }
  
  static async putCommit ({repo, commit}) {
    let headers = GitCommit.parseHeaders(commit)
    try {
      let sha = await GitRepo.putObject({repo, binaryString: GitCommit.wrapObject(commit)})
      let timestamp = pad(10, headers.author.timestamp, '0')
      await db(repo).put(`:time:${timestamp}:${sha}`, commit)
      return sha
    } catch (e) {
      throw (e)
    }
  }
    
  static async putBranch ({repo, ref, sha}) {
    return await db(repo).put(`:refs:branches:${ref}`, sha)
  }
  
  static async getBranch ({repo, ref}) {
    try {
      return await db(repo).get(`:refs:branches:${ref}`)
    } catch (err) {
      if (err.notFound) return null
      throw(err)
    }
  }
  
  static async putTag ({repo, ref, sha}) {
    return await db(repo).put(`:refs:tags:${ref}`, sha)
  }
 
  static async getTag ({repo, ref}) {
    try {
      return await db(repo).get(`:refs:tags:${ref}`)
    } catch (err) {
      if (err.notFound) return null
      throw(err)
    }
  }
  
  static async getAllRefs ({repo}) {
    let results = await db(repo).prefix(`:refs:`)
    return results
  }
  
  static async listBranches ({repo}) {
    let results = await db(repo).prefix(`:refs:branches:`)
    let pretty = results.map(x => x.key)
    return pretty
  }

  static async listTags ({repo}) {
    let results = await db(repo).prefix(`:refs:tags:`)
    let pretty = results.map(x => x.key)
    return pretty
  }

  static async getCommitsSinceTimestamp ({repo, timestamp}) {
    let results = await db(repo).range(`:time:${timestamp}`, `:time:~`)
    let pretty = results.map(x => GitCommit.parse(x.value))
    return pretty
  }

  static async exists ({repo}) {
    let results = await db(repo).prefix(':')
    return (results.length > 0)
  }
  
  // TODO: return a Generator instead of an array
  static async clone ({repo}) {
    return db(repo).range('','~')
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
