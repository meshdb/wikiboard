'use strict'
// This serves one repo. To serve multiple repos, mount this
// handler as an endpoint. Repos don't really interact with
// each other. They're units.
const { GitRepo, GitCommit, GithubRemote, WebRTCRemote, GithubFriends, GithubKeyManager, PGP } = require('../src/meshdb')

async function app (req, res) {
  let route = req.url
  let repo = 'matthew-andrews/isomorphic-fetch'

  if (route === '/clone') {
    GithubRemote.clone({
      token: process.env.GITHUB_TOKEN,
      origin: repo,
      since: 0
    })
  }
  
  if (route === '/info/refs') {
    res.statusCode = 200
    res.setHeader('Content-Type', 'text/plain; charset=utf-8')
    let refs = await GitRepo.getAllRefs({repo})
    for (let ref of refs) {
      ref.key = ref.key.replace(/:/g, '/').replace(/branches/, 'heads')
      res.write(ref.value + ' refs/' + ref.key + '\n')
    }
    res.end()
  } else {
    res.statusCode = 404
    res.write('Not Found')
    res.end()
  }
}

const http = require('http')
let server = http.createServer(app)
server.listen(8080)