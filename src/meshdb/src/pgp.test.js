"use strict"
import test from 'ava'
import openpgp from './pgp'

test('lookup', async t => {
  let keys = await openpgp.lookup('wmhilton@gmail.com')
  t.true(keys.includes('9609b8a5928ba6b9'))
})

test('lookup (email misspelled)', async t => {
  let keys = await openpgp.lookup('wmhilton@gmailcom')
  t.is(keys, null)
})

test('keygen, sign and verify', async t => {
  let key = await openpgp.keygen('Alice', 'alice@example.com')
  let signedmsg = await openpgp.sign('alice@example.com', 'Hello World')
  t.true(signedmsg.trim().startsWith('-----BEGIN PGP SIGNED MESSAGE-----'))
  let verify = await openpgp.verify('alice@example.com', signedmsg)
  t.true(verify)
})

// module.exports =  {
//   lookup,
//   keygen,
//   list,
//   encrypt,
//   decrypt,
//   sign,
//   verify
// }
