'use strict'
// Run in a WebWorker environment, e.g.
// if (window.Worker) {
//   let service = new Worker('GitWorker.js')
//   service.onmessage = function (e) {
//     console.log(e.data)
//   }
//   service.onerror = function (e) {
//     console.log(e)
//   }
// }
require('crypto')
console.log('Hello from GitWebWorker.js')
import { GithubRepo } from './GithubRepo'
// import { GitRepo } from './GitRepo'

self.onmessage = async function ({data}) {
  let nonce = data[0]
  let fnName = data[1]
  let fnArgs = data[2]
  let result
  switch (fnName) {
    case 'listBranches':
      result = await listBranches(...fnArgs)
      self.postMessage([nonce, result])
      break
    case 'clone':
      result = await clone(...fnArgs)
      self.postMessage([nonce, result])
      break
    default:
      self.postMessage([nonce, new Error('undefined function')])
  }
}

async function listBranches (name) {
  let repo = new GithubRepo(name)
  let results = await repo.listBranches()
  return results
}

async function clone ({authToken, origin}) {
  let repo = new GithubRepo({authToken, origin})
  return 'everything is awesome'
}