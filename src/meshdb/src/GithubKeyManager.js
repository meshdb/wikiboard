'use strict'
import { PGP } from './pgp'

export class GithubKeyManager {
  static async postGpgKey ({token, key}) {
    return window.fetch('https://api.github.com/user/gpg_keys', {
      method: 'POST',
      headers: {
        'Accept': 'application/vnd.github.cryptographer-preview',
        'Authorization': 'token ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        armored_public_key: key
      })
    }).then(res => res.json())
  }
  
  static async exportPublicKey (email) {
    return PGP.exportPublicKey(email)
  }
}
