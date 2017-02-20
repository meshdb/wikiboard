'use strict'
// A small abstraction around our Github API requests
import { GitRepo } from './GitRepo'

export class GithubRemote {
  static async clone ({token, origin, branch, since}) {
    let json
    let checkoutBranch
    if (branch) {
      checkoutBranch = branch
    } else {
      console.log('Getting default branch')
      json = await GithubRemote.repo({token, origin})
      checkoutBranch = json.default_branch
    }
    console.log('Receiving branches list')
    json = await GithubRemote.branches({token, origin})
    for (let branch of json) {
      await GitRepo.putBranch({repo: origin, ref: branch.name, sha: branch.commit.sha})
    }
    console.log('Receiving tags list')
    json = await GithubRemote.tags({token, origin})
    for (let tag of json) {
      await GitRepo.putTag({repo: origin, ref: tag.name, sha: tag.commit.sha})
    }
    console.log('Cloning default branch')
    json = await GithubRemote.commits({token, origin, commitish: checkoutBranch, since})
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
          await GitRepo.putCommit({repo: origin, commit: comm})
          console.log('Added commit', commit.sha)
        } catch (e) {
          console.log(e.message, commit.sha)
        }
      }
    }
    return
  }

  static async repo ({token, origin}) {
    return window.fetch(`https://api.github.com/repos/${origin}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token
      }
    }).then(res => res.json())
  }

  static async branches ({token, origin}) {
    return window.fetch(`https://api.github.com/repos/${origin}/branches`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token
      }
    }).then(res => res.json())
  }

  static async tags ({token, origin}) {
    return window.fetch(`https://api.github.com/repos/${origin}/tags`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token
      }
    }).then(res => res.json())
  }

  static async commits ({token, origin, commitish, since}) {
    let url = `https://api.github.com/repos/${origin}/commits?sha=${commitish}`
    if (since) {
      let date = (new Date(since * 1000)).toISOString()
      url += `&since=${date}`
    }
    return window.fetch(url, {
      headers: {
        'Accept': 'application/vnd.github.cryptographer-preview',
        'Authorization': 'token ' + token
      }
    }).then(res => res.json())
  }
}
