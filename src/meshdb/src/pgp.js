'use strict'
const openpgp = require('openpgp')
openpgp.config.aead_protect = false
openpgp.config.prefer_hash_algorithm = 2 // SHA1
var hkp = new openpgp.HKP('https://pgp.mit.edu')
var hkp2 = new openpgp.HKP('http://keys.gnupg.net')
var keyring = new openpgp.Keyring()

// Print a key
function printKey () {
  let keyid = printKeyid(this.primaryKey.getKeyId())
  let userid = printUser(this.getPrimaryUser().user)
  return keyid + ' ' + userid
}
openpgp.key.toString = printKey

function printKeyid (keyid) {
  return keyid.toHex()
}
openpgp.Keyid.prototype.toString = openpgp.Keyid.prototype.toHex

function printUser (user) {
  return user.userId.userid
}

function getFullSignature (signature) {
  let key = keyring.getKeysForId(printKeyid(signature.keyid))[0]
  let user = key.getPrimaryUser().user
  signature.user = user
  signature.email = printUser(user).match(/<(.*)>/)[1]
  return signature
}

// Find the public key(s) for `email` on the local browser keyring.
function locallookup (email) {
  let keys = keyring.publicKeys.getForAddress(email)
  if (keys.length === 0) {
    return null
  }
  keys[0].toString = printKey
  return keys[0]
}

// Cached lookup
function cachedLookup (email) { // eslint-disable-line no-unused-vars
  let res = locallookup(email)
  if (res) return Promise.resolve(res)
  return lookup(email)
}

export class PGP {
  // Find the public key(s) for `email` on a server (note - how can you trust the PGP server?) add them to the browser keyring.
  static lookup (email) {
    return new Promise((resolve, reject) => {
      // Has no option to do an exact email search for some reason.
      // william@example.net instead returns results for "william example net"
      // so we must work around this stupidity
      hkp.lookup({ query: email }).then(function (keys) {
        if (typeof keys === 'undefined') {
          return resolve(null)
        }
        keys = openpgp.key.readArmored(keys).keys
        // Find keys with an exact match for the email address given
        let results = []
        for (let k of keys) {
          for (let u of k.users) {
            if (u.userId.userid.includes(`<${email}>`)) {
              results.push(k.primaryKey.keyid.toHex())
              keyring.publicKeys.push(k)
            }
          }
        }
        results = results.length > 0 ? results : null
        resolve(results)
      }).catch(err => {
        console.log('err =', err)
        resolve(null)
      })
    })
  }
  
  // Generate a key pair in the browser and add it to the browser keyring.
  static keygen (name, email) {
    return openpgp.generateKey({
      userIds: [{
        name: name,
        email: email
      }]
    }).then(({ privateKeyArmored, publicKeyArmored }) => {
      keyring.publicKeys.importKey(publicKeyArmored)
      keyring.privateKeys.importKey(privateKeyArmored)
      let key = openpgp.key.readArmored(privateKeyArmored).keys[0]
      key.toString = printKey
      // We need to manually call this to save the keypair to localstorage
      keyring.store()
    })
  }
  
  // Returns a human-readable list of all the public keys in the browser's keyring.
  static list () {
    return new Promise((resolve, reject) => {
      let print = []
      for (let key of keyring.publicKeys.keys) {
        print.push(printKey.apply(key))
      }
      resolve(print)
    })
  }
  
  // Encrypt `msg` using the public key for `email`
  static encrypt (email, msg) {
    // Load Alice's keypair from localstorage
    // let privateKey = keyring.privateKeys.keys[0]
    let publicKey = locallookup(email)
    return openpgp.encrypt({
      publicKeys: publicKey,   // NOTE: it's plural...
      data: msg
    }).then(function (encrypted) {
      return encrypted.data
    })
  }
  
  // Decrypt `msg` using the private key for `email`
  // msg should be the full encrypted message including the -----BEGIN PGP MESSAGE----- and -----END PGP MESSAGE----- lines.
  static decrypt (email, msg) {
    let privateKey = PGP.lookupPrivateKey(email)
    return openpgp.decrypt({
      privateKey: privateKey,
      message: openpgp.message.readArmored(msg)
    }).then(function (decrypted) {
      return decrypted.data
    })
  }
  
  // Sign `msg` using the private key for `email'
  static sign (email, msg) {
    // Load keypair from localstorage
    let privateKey = PGP.lookupPrivateKey(email)
    if (privateKey) {
      return openpgp.sign({
        privateKeys: privateKey,
        data: msg
      }).then(function (signed) {
        return signed.data
      })
    } else {
      throw new Error('No PrivateKey in the OpenPGP keyring for the email address: ' + email)
    }
  }
  
  // Verify a signed `msg` using the public key for `email`
  static async verify (email, msg) {
    let publicKeys = await lookup(email)
    return openpgp.verify({
      publicKeys: publicKeys,
      message: openpgp.cleartext.readArmored(msg)
    }).then(function (verified) {
      console.log(verified)
      let signature = verified.signatures.map(getFullSignature)
      signature = signature.filter(x => x.email === email)
      if (signature.length !== 1) {
        return false
      } else {
        return signature[0].valid
      }
    })
  }
  
  // Sign `plaintext` using the private key for `email'
  static async createBinaryDetachedSignature (email, plaintext) {
    // Load keypair from localstorage
    let privateKey = PGP.lookupPrivateKey(email)
    if (privateKey) {
      // Is the only difference between cleartext signatures and detached binary the text normalization?
      // If so, I could probably add that functionality to openpgpjs - I'd just need a little guidance
      // on how to encode the PacketType and add the functionality to export to armor.js
      let bytes = openpgp.util.str2Uint8Array(plaintext)
      let message = openpgp.message.fromBinary(bytes)
      let signedMessage = message.sign([privateKey])
      let signature = signedMessage.packets.filterByTag(openpgp.enums.packet.signature)
      let armoredMessage = openpgp.armor.encode(openpgp.enums.armor.message, signature.write())
      // Github won't recognize the signature unless we rename the headers (Tested 2017-01-04)
      armoredMessage = armoredMessage.replace('-----BEGIN PGP MESSAGE-----\r\n', '-----BEGIN PGP SIGNATURE-----\r\n')
      armoredMessage = armoredMessage.replace('-----END PGP MESSAGE-----\r\n', '-----END PGP SIGNATURE-----\r\n')
      return armoredMessage
    } else {
      throw new Error('No PrivateKey in the OpenPGP keyring for the email address: ' + email)
    }
  }
  
  // Verify `message` with detached `signature` using the public key for `email`
  static async verifyDetachedSignature (email, message, signature) {
    await lookup(email)
    console.log('email, message, signature =', email, message, signature)
    let msg = openpgp.message.readSignedContent(message, signature)
    console.log('msg =', msg)
    var result = msg.verify(keyring.publicKeys.keys)
    console.log('result[0] =', result[0])
    console.log('keyid =', printKeyid(result[0].keyid))
    return result[0].valid
  }
  
  // Returns true if the keyring has a private key for `email`.
  static hasPrivateKey (email) {
    let keys = keyring.privateKeys.getForAddress(email)
    return keys.length > 0
  }
  
  // Export public signing key
  static exportPublicKey (email) {
    return PGP.lookupPrivateKey(email).toPublic().armor().trim().replace(/\r/g, '')
  }
  
  // Upload the public signing key to the MIT key server
  static publish (email) {
    let key = PGP.exportPublicKey(email)
    return Promise.all([hkp.upload(key), hkp2.upload(key)])
  }
  
  static lookupPrivateKey (email) {
    let keys = keyring.privateKeys.getForAddress(email)
    if (keys.length === 0) {
      return null
    }
    keys[0].toString = printKey
    return keys[0]
  }
}
