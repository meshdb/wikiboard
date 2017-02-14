'use strict'
const _ = require('lodash')

export class GithubFriends {
  constructor ({authToken}) {
    // A little bit of "sticky" memory for this data for convenience.
    token = authToken
  }
  
  static async fetchFriends ({token}) {
    let followers = await GithubFriends.followers({token})
    let following = await GithubFriends.following({token})
    let logins = _.union(followers, following)
    console.log('logins =', logins)
    let friends = []
    for (let login of logins) {
      let friend = await GithubFriends.fetchUser({token, login})
      friends.push(friend)
    }
    return friends
  }

  static async followers ({token}) {
    let res = await window.fetch(`https://api.github.com/user/followers`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token
      }
    })
    let json = await res.json()
    return json.map(x => x.login)
  }

  static async following ({token}) {
    let res = await window.fetch(`https://api.github.com/user/following`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token
      }
    })
    let json = await res.json()
    return json.map(x => x.login)
  }
  
  static async fetchUser ({token, login}) {
    let res = await window.fetch(`https://api.github.com/users/${login}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token
      }
    })
    let json = await res.json()
    return _.pick(json, ['login', 'email', 'name'])
  }
  
  static async fetchKeys ({token, login}) {
    let res = await window.fetch(`https://api.github.com/users/${username}/gpg_keys`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': 'token ' + token
      }
    })
    let json = await res.json()
    return json.map(x => x.login)
  }
}
