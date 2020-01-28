/*
 * Copyright 2013-2019 The NATS Authors
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
const after = require('mocha').after
const before = require('mocha').before
const describe = require('mocha').describe
const it = require('mocha').it

describe('Direct NKeys and Signatures', function () {
  this.timeout(5000)

  const PORT = 22233
  let server

  // Start up our own nats-server
  before((done) => {
    // We need v2 or above for these tests.
    const version = nsc.serverVersion()
    if ((/\s+2\./).exec(version) !== null) {
      this.skip()
    }
    const flags = ['-c', './test/configs/nkey.conf']
    server = nsc.startServer(PORT, flags, done)
  })

  const nkeySeed = 'SUAIBDPBAUTWCWBKIO6XHQNINK5FWJW4OHLXC3HQ2KFE4PEJUA44CNHTC4'

  // Shutdown our server after we are done
  after(function (done) {
    nsc.stopServer(server, done)
  })

  it('should connect with direct nkey and sig', (done) => {
    const nc = NATS.connect({
      port: PORT,
      nkey: 'UAH42UG6PV552P5SWLWTBP3H3S5BHAVCO2IEKEXUANJXR75J63RQ5WM6',
      nonceSigner: function (nonce) {
        const sk = nkeys.fromSeed(Buffer.from(nkeySeed))
        return sk.sign(nonce)
      }
    })
    nc.on('connect', function (client) {
      client.should.equal(nc)
      nc.close()
      done()
    })
    nc.on('error', function (err) {
      nc.close()
      done(err)
    })
  })
})
