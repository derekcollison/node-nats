/*
 * Copyright 2013-2020 The NATS Authors
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/* jslint node: true */
'use strict'

const NATS = require('../')
const nkeys = require('ts-nkeys')
const nsc = require('./support/nats_server_control')
const should = require('should')
const describe = require('mocha').describe
const after = require('mocha').after
const before = require('mocha').before
const it = require('mocha').it

describe('NKeys, Signatures and User JWTs', function () {
  this.timeout(5000)

  const PORT = 22222
  let server

  const uSeed = 'SUAIBDPBAUTWCWBKIO6XHQNINK5FWJW4OHLXC3HQ2KFE4PEJUA44CNHTC4'
  const uJWT = 'eyJ0eXAiOiJqd3QiLCJhbGciOiJlZDI1NTE5In0.eyJqdGkiOiJFU1VQS1NSNFhGR0pLN0FHUk5ZRjc0STVQNTZHMkFGWERYQ01CUUdHSklKUEVNUVhMSDJBIiwiaWF0IjoxNTQ0MjE3NzU3LCJpc3MiOiJBQ1pTV0JKNFNZSUxLN1FWREVMTzY0VlgzRUZXQjZDWENQTUVCVUtBMzZNSkpRUlBYR0VFUTJXSiIsInN1YiI6IlVBSDQyVUc2UFY1NTJQNVNXTFdUQlAzSDNTNUJIQVZDTzJJRUtFWFVBTkpYUjc1SjYzUlE1V002IiwidHlwZSI6InVzZXIiLCJuYXRzIjp7InB1YiI6e30sInN1YiI6e319fQ.kCR9Erm9zzux4G6M-V2bp7wKMKgnSNqMBACX05nwePRWQa37aO_yObbhcJWFGYjo1Ix-oepOkoyVLxOJeuD8Bw'

  // Start up our own nats-server
  before(function (done) {
    // We need v2 or above for these tests.
    const version = nsc.serverVersion()
    if ((/\s+1\./).exec(version) !== null) {
      this.skip()
    }
    const flags = ['-c', './test/configs/operator.conf']
    server = nsc.startServer(PORT, flags, done)
  })

  const uri = 'nats://localhost:' + PORT

  // Shutdown our server after we are done
  after(done => {
    nsc.stopServer(server, done)
  })

  it('should error when no signature callback provided', done => {
    const nc = NATS.connect(PORT)
    nc.on('error', err => {
      should.exist(err)
      should.exist((/requires an nkey signature/i).exec(err))
      nc.close()
      done()
    })
  })

  it('should error when nonceSigner not a function', done => {
    const nc = NATS.connect({
      port: PORT,
      nonceSigner: 'BAD'
    })
    nc.on('error', err => {
      should.exist(err)
      should.exist((/not a function/).exec(err))
      nc.close()
      done()
    })
  })

  it('should error when no nkey or userJWT callback defined', done => {
    const nc = NATS.connect({
      port: PORT,
      nonceSigner: nonce => {
      }
    })
    nc.on('error', err => {
      should.exist(err)
      should.exist((/Nkey or User JWT/).exec(err))
      nc.close()
      done()
    })
  })

  it('should connect when userJWT and sig provided', done => {
    const nc = NATS.connect({
      port: PORT,
      nonceSigner: nonce => {
        const sk = nkeys.fromSeed(Buffer.from(uSeed))
        return sk.sign(nonce)
      },
      userJWT: uJWT
    })
    nc.on('connect', client => {
      client.should.equal(nc)
      nc.close()
      done()
    })
    nc.on('error', err => {
      nc.close()
      done(err)
    })
  })

  it('should connect when userJWT is a callback function', done => {
    const nc = NATS.connect({
      port: PORT,
      nonceSigner: nonce => {
        const sk = nkeys.fromSeed(Buffer.from(uSeed))
        return sk.sign(nonce)
      },
      userJWT: () => uJWT
    })
    nc.on('connect', client => {
      client.should.equal(nc)
      nc.close()
      done()
    })
    nc.on('error', err => {
      nc.close()
      done(err)
    })
  })

  it('should connect with a user credentials file', done => {
    const nc = NATS.connect({
      port: PORT,
      userCreds: './test/configs/nkeys/test.creds'
    })
    nc.on('connect', client => {
      client.should.equal(nc)
      nc.close()
      done()
    })
    nc.on('error', err => {
      nc.close()
      done(err)
    })
  })

  it('should connect with new style of connect with url and a user credentials file', done => {
    const nc = NATS.connect(uri, NATS.creds('./test/configs/nkeys/test.creds'))
    nc.on('connect', (client) => {
      client.should.equal(nc)
      nc.close()
      done()
    })
    nc.on('error', (err) => {
      nc.close()
      done(err)
    })
  })
})
