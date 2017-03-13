<template>
  <div id="app">
    <div>
      <b>My Account:</b><br>
      signingKey: {{ signingKey }}
      <login-with-github @login="login" client_id="2e65f688150e32999dad" scope="read:gpg_key">
        <button slot="login" class="ui primary button">
          <i class="github icon"></i> Sign In
        </button>
        <button slot="logout" class="ui button">
          <i class="github icon"></i> Sign Out
        </button>
      </login-with-github>
      <!--
      <login-with-github @login="uploadSigningKey" client_id="2e65f688150e32999dad" scope="write:gpg_key">
        <button slot="login" class="ui primary button">
          <i class="github icon"></i> Upload Public Key
        </button>
        <button slot="logout" class="ui button">
          <i class="github icon"></i> Uploaded
        </button>
      </login-with-github>
    -->
      <br>
      Friends: {{ friends.map(x => x.login).join(', ') }}
    </div>
    <hr>
    <div>
      <b>Forum / Repo:</b><br>
      <input type="text" v-model="repoName" placeholder="user/repo"></input>
      <button type="button" @click="cloneGithub" title="Uses ye old DNS for discovery and the Github REST API for delivery">Clone from Github</button>
      <button type="button" @click="cloneWebRTC" title="Uses 'signalhub' for discovery and 'webrtc-swarm' for delivery">Clone with WebRTC</button>
      <button type="button" @click="cloneWebTorrent" title="Uses 'bittorrent-tracker' for discovery and 'bittorrent-protocol' for delivery">Clone with WebTorrent</button>
      <div>
        Available Threads (branches): {{ branches }}
        <br>
        Available Threads (tags): {{ tags }}
        <br>
        <!-- Aliases? (tags): {{ tags }} -->
      </div>
    </div>
    <hr>
    <div>
      <b>Thread / Branch Graph:</b><br>
      <button type="button" @click="getCommitGraph">Checkout All</button>
      <h3 class="ui dividing header">Comments</h3>
      <comment-list :comments="comments"></comment-list>
    </div>
  </div>
</template>

<script>
import 'babel-polyfill'
import _ from 'lodash'

import { GitRepo, GitCommit, GitLog, GithubRemote, WebRTCRemote, WebTorrentRemote, GithubFriends, GithubKeyManager, PGP } from './meshdb'
window.PGP=PGP
window.GitRepo = GitRepo
window.GitCommit = GitCommit
window.GitLog = GitLog
window.WebRTCRemote = WebRTCRemote

import LoginWithGithub from './login-with-github/vue/component.vue'
import CommentList from './vue-semantic-ui-comments/comment-list.vue'

window.repo = null

export default {
  name: 'app',
  components: {
    LoginWithGithub,
    CommentList,
  },
  created () {
    WebRTCRemote.connect()
  },
  data () {
    return {
      signingKey: '',
      authToken: null,
      repoName: 'meshdb/presentation',
      head: 'master',
      branches: [],
      tags: [],
      commits: [],
      gitgraph: null,
      comments: [],
      username: null,
      name: null,
      email: null,
      avatar_url: null,
      temp: '',
      friends: [],
      commitsOnBranch: {},
      composedMessage: {}
    }
  },
  methods: {
    login (authToken) {
      this.authToken = authToken
      this.init()
    },
    async init () {
      window.app = this
      await this.fetchUser()
      this.dummyComments()
    },
    async fetchUser () {
      return window.fetch('https://api.github.com/user', {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'Authorization': 'token ' + this.authToken
        }
      })
      .then(res => res.json())
      .then(json => {
        this.username = json.login
        this.name = json.name
        this.email = json.email
        this.avatar_url = json.avatar_url
      }).then(() => {
        if (!PGP.hasPrivateKey(this.email)) {
          console.log('Missing signing key for this email address.')
          console.log('Generating one now.')
          PGP.keygen(this.name, this.email)
          .then(() => {
            console.log('Signing key created!')
          })
        }
      }).then(() => {
        this.signingKey = String(PGP.lookupPrivateKey(this.email))
      })
    },
    async uploadSigningKey (token) {
      console.log('this.email =', this.email)
      let key = GithubKeyManager.exportPublicKey(this.email)
      console.log(key)
      let json = await GithubKeyManager.postGpgKey({token, key})
      console.log('json =', json)
    },
    async cloneGithub () {
      await GithubRemote.clone({
        token: this.authToken,
        origin: this.repoName,
        since: 0
      })
      this.branches = await GitRepo.listBranches({repo: this.repoName})
      this.tags = await GitRepo.listTags({repo: this.repoName})
      // Clone all branches too
      for (let branch of this.branches) {
        await GithubRemote.clone({
          token: this.authToken,
          origin: this.repoName,
          branch: branch,
          since: 0
        })
      }
    },
    async cloneWebRTC () {
      await WebRTCRemote.clone({repo: this.repoName})
      this.branches = await GitRepo.listBranches({repo: this.repoName})
      this.tags = await GitRepo.listTags({repo: this.repoName})
    },
    async cloneWebTorrent () {
      await WebTorrentRemote.clone({repo: this.repoName})
      this.branches = await GitRepo.listBranches({repo: this.repoName})
      this.tags = await GitRepo.listTags({repo: this.repoName})
    },
    async getCommitGraph () {
      // for now, just assume all the threads/branches have names
      this.comments = await GitRepo.getCommitsSinceTimestamp({repo: this.repoName, timestamp: 0})
    },
    async dummyComments () {
      let friends = await GithubFriends.fetchFriends({token: this.authToken})
      // for (let comment of this.comments) {
      //   let author = _.sample(friends)
      //   Object.assign(comment.headers.author, author)
      // }
      this.friends = friends
    },
    async commit (message, branch) {
      if (branch) {
      } else {
        branch = this.head
      }
      console.log('testCommit')
      window.comm = GitCommit.render({
        tree: '4b825dc642cb6eb9a060e54bf8d69288fbee4904',
        author: {
          name: this.name,
          email: this.email,
          date: new Date(),
          timezoneOffset: (new Date()).getTimezoneOffset()
        },
        parent: [await window.repo.getBranch(branch)],
        message: message
      })
      console.log('comm =', window.comm)
      window.comm = await GitCommit.addSignature(window.comm)
      console.log('comm =', window.comm)
      console.log(await GitCommit.verifySignature(window.comm))
      let sha = await window.repo.putCommit(window.comm)
      console.log('sha =', sha)
      await window.repo.putBranch(branch, sha)
    },
    async push () {
    }
  },
}
</script>