'use strict'
// A small abstraction around our Github API requests
export class GithubRepo {
  constructor ({authToken, origin}) {
    // A little bit of "sticky" memory for this data for convenience.
    this.authToken = authToken
    this.origin = origin
  }
  
  async cloneInto ({repo, branch, since}) {
    let json
    let checkoutBranch
    if (branch) {
      checkoutBranch = branch
    } else {
      console.log('Getting default branch')
      json = await this.repo()
      checkoutBranch = json.default_branch
    }
    console.log('Receiving branches list')
    json = await this.branches()
    for (let branch of json) {
      await repo.putBranch(branch.name, branch.commit.sha)
    }
    console.log('Receiving tags list')
    json = await this.tags()
    for (let tag of json) {
      await repo.putTag(tag.name, tag.commit.sha)
    }
    console.log('Cloning default branch')
    json = await this.commits({commitish: checkoutBranch, since})
    for (let commit of json) {
      if (commit.commit.verification.payload) {
        try {
          let comm = GitCommit.fromPayloadSignature({
            payload: commit.commit.verification.payload,
            signature: commit.commit.verification.signature,
          })
          if (commit.sha !== GitCommit.sha(comm)) {
            throw new Error('Commit hash does not match the computed SHA1 sum.')
          }
          console.log('GitCommit.fromPayloadSignature(commit) =', comm)
          await repo.putCommit(comm)
          console.log('Added commit', commit.sha)
        } catch (e) {
          console.log(e.message, commit.sha)
        }
      }
    }
    return
  }

  repo () {
    return window.fetch(`https://api.github.com/repos/${this.origin}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + this.authToken
      }
    }).then(res => res.json())
  }

  branches () {
    return window.fetch(`https://api.github.com/repos/${this.origin}/branches`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + this.authToken
      }
    }).then(res => res.json())
  }

  tags () {
    return window.fetch(`https://api.github.com/repos/${this.origin}/tags`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + this.authToken
      }
    }).then(res => res.json())
  }

  commits ({commitish, since}) {
    let url = `https://api.github.com/repos/${this.origin}/commits?sha=${commitish}`
    if (since) {
      let date = (new Date(since * 1000)).toISOString()
      url += `&since=${date}`
    }
    return window.fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.cryptographer-preview',
        'Authorization': 'token ' + this.authToken
      }
    }).then(res => res.json())
  }
}
