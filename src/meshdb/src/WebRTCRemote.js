'use strict'
import { GitRepo } from './GitRepo'
const wrtc = require('wrtc')
const swarm = require('webrtc-swarm')
const signalhub = require('signalhub')
const uuid = require('uuid/v4')
let myId = uuid()
let hub, sw

let state = {
  wants: new Set(),
  expects: new Set()
}

// TODO: Replace with a real format
// Splits strings into [command, identifier, body]
function parseMessage (data) {
  data = data.toString() // change from buffer to string
  return data.match(/^(\S+) ?(\S+)? ?([\S\s]*)?/m).slice(1)
}

// TODO: Turn this into a state-machine protocol?
function responder (peer, id) {
  return async function (data) {
    console.log(id + ': ' + data)
    let [cmd, ident, body] = parseMessage(data)
    if (cmd === 'want' && ident === 'repo') {
      if (GitRepo.exists({repo: body})) {
        console.log('has it')
        peer.send('have repo ' + body)
      } else {
        console.log('doesnt has it')
      }
    } else if (cmd === 'have' && ident === 'repo') {
      // Only act if we want this repo
      // (delete returns true if it existed... atomic operations and all that)
      if (state.wants.delete(body)) {
        state.expects.add(body)
        peer.send('clone repo ' + body)
      }
    } else if (cmd === 'clone' && ident === 'repo') {
      // Check that we have that repo
      if (GitRepo.exists({repo: body})) {
        let clone = await GitRepo.clone({repo: body})
        for (let item of clone) {
          peer.send('store repo ' + body + ' ' + item.key + ' ' + item.value)
        }
      }
    // TODO: treat as a stream so we can apply back pressure
    } else if (cmd === 'store') {
      let [repo, key, value] = parseMessage(body)
      if (state.expects.has(repo)) {
        await GitRepo.put({repo, key, value})
      }
    }
  }
}

export class WebRTCRemote {
  static uuid () {
    return myId
  }
  
  static swarm () {
    return sw
  }
  
  static connect () {
    console.log('connecting to mesh...')
    hub = signalhub('swarm-example', ['https://signalhub-jccqtwhdwc.now.sh']) // ['https://radiant-mesa-56755.herokuapp.com/'])
    sw = swarm(hub, {
      wrtc: !swarm.WEBRTC_SUPPORT ? require('wrtc') : null, // don't need this if used in the browser
      uuid: WebRTCRemote.uuid()
    })

    sw.on('peer', function (peer, id) {
      console.log('connected to a new peer:', id)
      console.log('Total peers:', sw.peers.length)
      peer.on('data', responder(peer, id))
    })

    sw.on('disconnect', function (peer, id) {
      console.log('disconnected from a peer:', id)
      console.log('Total peers:', sw.peers.length)
    })
  }
  
  static async send (data) {
    for (let peer of sw.peers) {
      peer.send(data)
    }
  }
  
  static async clone ({repo, branch, since}) {
    // TODO: throttle? serialize?
    state.wants.add(repo)
    for (let peer of sw.peers) {
      peer.send(`want repo ${repo}`)
    }
    // TODO: figure out how to wait for final response.
    // waitForEvent()
    // wait for a response
    //race?
    // Possible verbs:
    // want, have, give, take, send, here, find, need
    // winningpeer.send(`send repo::${origin}::refs`)
    // winningpeer.send(`send repo::${origin}`)
    // wait for response
    // winningpeer.on('here objects::SHA ', () => {
    //   GitRepo.putObject({repo: origin, binaryString: binaryString})
    // })
    // check SHA matches
    // putBranches
    // putTags
    //
    return
  }
}
