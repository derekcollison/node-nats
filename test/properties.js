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
/* jshint -W030 */
'use strict'

const NATS = require('../')
const describe = require('mocha').describe
const it = require('mocha').it
const net = require('net')
const should = require('should')

describe('Base Properties', () => {
  it('should have a version property', () => {
    NATS.version.should.match(/[0-9]+\.[0-9]+\.[0-9]+/)
  })

  it('should have the same version as package.json', () => {
    const v = require('../package.json').version
    NATS.version.should.equal(v)
  })

  it('should have a connect function', () => {
    NATS.connect.should.be.a.Function()
  })

  it('should have a createInbox function', () => {
    NATS.createInbox.should.be.a.Function()
  })
})

describe('Connection Properties', () => {
  let nc = NATS.connect()
  should.exist(nc)

  it('should have a publish function', () => {
    nc.publish.should.be.a.Function()
  })

  it('should have a subscribe function', () => {
    nc.subscribe.should.be.a.Function()
  })

  it('should have an unsubscribe function', () => {
    nc.unsubscribe.should.be.a.Function()
  })

  it('should have a request function', () => {
    nc.request.should.be.a.Function()
  })

  it('should have an options hash with proper fields', () => {
    nc.should.have.property('options')
    nc.options.should.have.property('url')
    nc.options.should.have.property('verbose')
    nc.options.should.have.property('pedantic')
    nc.options.should.have.property('reconnect')
    nc.options.should.have.property('maxReconnectAttempts')
    nc.options.should.have.property('reconnectTimeWait')
    nc.options.should.have.property('reconnectJitter')
    nc.options.should.have.property('reconnectJitterTLS')
    nc.options.should.have.property('reconnectDelayHandler')
    nc.options.should.have.property('useOldRequestStyle')
    nc.options.useOldRequestStyle.should.equal(false)
    nc.options.noEcho.should.be.false()
  })

  it('should have an parsed url', () => {
    nc.should.have.property('url')
    nc.url.should.be.an.Object()
    nc.url.should.have.property('protocol')
    nc.url.should.have.property('host')
    nc.url.should.have.property('port')
  })

  nc.close()

  it('should allow options to be overridden', () => {
    const options = {
      url: 'nats://localhost:22421',
      verbose: true,
      pedantic: true,
      reconnect: false,
      maxReconnectAttempts: 22,
      reconnectTimeWait: 11,
      useOldRequestStyle: true
    }

    nc = NATS.connect(options)
    nc.on('error', () => {}) // Eat error

    nc.options.url.should.equal('nats://localhost:22421')
    nc.options.verbose.should.equal(true)
    nc.options.pedantic.should.equal(true)
    nc.options.reconnect.should.equal(false)
    nc.options.maxReconnectAttempts.should.equal(22)
    nc.options.reconnectTimeWait.should.equal(11)
    nc.options.useOldRequestStyle.should.equal(true)
    nc.close()
  })

  it('should reject non-object options', () => {
    try {
      NATS.connect('localhost:4222', 'some string')
    } catch (err) {
      err.should.be.instanceof(NATS.NatsError)
      err.should.have.property('code', NATS.BAD_OPTIONS)
    }
  })

  it('should honor noEcho', (done) => {
    let client
    const srv = net.createServer((c) => {
      client = c
      client.write('INFO ' + JSON.stringify({
        server_id: 'TEST',
        version: '0.0.0',
        node: 'node0.0.0',
        host: '127.0.0.1',
        port: srv.address.port,
        auth_required: false,
        ssl_required: false,
        tls_required: false,
        tls_verify: false
      }) + '\r\n')
    })
    srv.listen(0, () => {
      const p = srv.address().port
      const nc = NATS.connect('nats://localhost:' + p, {
        noEcho: true,
        maxReconnectAttempts: 2,
        reconnectTimeWait: 100
      })
      let attempts = 0
      nc.on('error', (err) => {
        attempts++
        err.should.be.instanceof(NATS.NatsError)
        err.should.have.property('code', NATS.NO_ECHO_NOT_SUPPORTED)
      })
      nc.on('close', () => {
        // validate that we tried to reconnect
        attempts.should.be.equal(3)
        client.end(() => {
          srv.close(done)
        })
      })
    })
  })

  it('should not die, if it publishes after closeStream() triggers', (done) => {
    let client
    const srv = net.createServer((c) => {
      client = c
      client.write('INFO ' + JSON.stringify({
        server_id: 'TEST',
        version: '0.0.0',
        node: 'node0.0.0',
        host: '127.0.0.1',
        port: srv.address.port,
        auth_required: false,
        ssl_required: false,
        tls_required: false,
        tls_verify: false
      }) + '\r\n')
    })
    srv.listen(0, () => {
      const p = srv.address().port
      const nc = NATS.connect('nats://localhost:' + p, {
        noEcho: true,
        maxReconnectAttempts: 2,
        reconnectTimeWait: 100
      })
      nc.on('error', () => {
        // we'll get an error here on the noEcho, but really
        // what we are interested is in publishing after that
        // error notification
        process.nextTick(() => {
          nc.publish('foo')
        })
      })
      nc.on('close', () => {
        client.end(() => {
          srv.close(done)
        })
      })
    })
  })

  it('timeout should be a number', () => {
    try {
      NATS.connect({ timeout: '500' })
    } catch (err) {
      err.should.be.instanceof(NATS.NatsError)
      err.should.have.property('code', NATS.BAD_OPTIONS)
      err.should.have.property('message', 'timeout should be a number')
    }
  })
})
