'use strict'
// This serves one repo. To serve multiple repos, mount this
// handler as an endpoint. Repos don't really interact with
// each other. They're units.
const Routr = require('routr')
const { GitRepo, GitCommit, GithubRemote, WebRTCRemote, GithubFriends, GithubKeyManager, PGP } = require('../src/meshdb')

class App {
  static create (options) {
    // Create routr
    let routes = new Routr([
      {
        name: 'inforefs',
        path: '/:user/:repo/info/refs',
      }, {
        name: 'clone',
        path: '/clone',
      }, {
        name: 'notFound',
        path: '*',
      }
    ])
    return function app (req, res) {
      // Route request
      let route = routes.getRoute(req.url)
      console.log(route)
      req.route = route
      App[route.name](req, res)
      return void(0)
    }
  }
  static async inforefs (req, res) {
    let repo = req.route.params.user + '/' + req.route.params.repo
    
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    let refs = await GitRepo.getAllRefs({repo})
    // Handle missing repos
    if (refs.length === 0) return App.notFound(req, res)
    for (let ref of refs) {
      ref.key = ref.key.replace(/:/g, '/').replace(/branches/, 'heads')
      res.write(ref.value + ' refs/' + ref.key + '\n')
    }
    res.end()
  }
  static async clone (req, res) {
    let { repo, branch } = req.route.query
    if (repo === undefined) return App.clientError(req, res)
    try {
      await GithubRemote.clone({
        token: process.env.GITHUB_TOKEN,
        origin: repo,
        branch: branch,
        since: 0
      })
    } catch (e) {
      console.log(e.response.status)
      console.log(e.message)
      res.statusCode = e.response.status
      res.write(e.message || 'Error')
      res.end()
      return
    }
    res.statusCode = 201
    res.write('Created')
    res.end()
  }
  static async notFound (req, res) {
    res.statusCode = 404
    res.write('Not Found')
    res.end()
  }
  static async clientError (req, res) {
    res.statusCode = 400
    res.write('Client Error')
    res.end()
  }
}

const http = require('http')
let app = App.create()
let server = http.createServer(app)
server.listen(8081, () => {
  console.log('listening')
})