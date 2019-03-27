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
/* global describe: false, before: false, after: false, it: false */
'use strict';

const NATS = require('../'),
    nsc = require('./support/nats_server_control'),
    should = require('should');

describe('Queues', function() {

    const PORT = 1425;
    let server;

    // Start up our own nats-server
    before(function(done) {
        server = nsc.start_server(PORT, done);
    });

    // Shutdown our server
    after(function(done) {
        nsc.stop_server(server, done);
    });

    it('should deliver a message to single member of a queue group', function(done) {
        const nc = NATS.connect(PORT);
        let received = 0;
        nc.subscribe('foo', {
            'queue': 'myqueue'
        }, function() {
            received += 1;
        });
        nc.publish('foo', function() {
            should.exists(received);
            received.should.equal(1);
            nc.close();
            done();
        });
    });

    it('should deliver a message to only one member of a queue group', function(done) {
        const nc = NATS.connect(PORT);
        let received = 0;
        const cb = function () {
            received += 1;
        };
        for (let i = 0; i < 5; i++) {
            nc.subscribe('foo', {
                'queue': 'myqueue'
            }, cb);
        }
        nc.publish('foo', function() {
            received.should.equal(1);
            nc.close();
            done();
        });
    });

    it('should allow queue subscribers and normal subscribers to work together', function(done) {
        const nc = NATS.connect(PORT);
        const expected = 4;
        let received = 0;
        const recv = function () {
            received += 1;
            if (received == expected) {
                nc.close();
                done();
            }
        };

        nc.subscribe('foo', {
            'queue': 'myqueue'
        }, recv);
        nc.subscribe('foo', recv);
        nc.publish('foo');
        nc.publish('foo');
        nc.flush();
    });

    it('should spread messages out equally (given random)', function(done) {
        /* jshint loopfunc: true */
        const nc = NATS.connect(PORT);
        const total = 5000;
        const numSubscribers = 10;
        const avg = total / numSubscribers;
        const allowedVariance = total * 0.05;
        const received = new Array(numSubscribers);

        for (var i = 0; i < numSubscribers; i++) {
            received[i] = 0;
            nc.subscribe('foo.bar', {
                'queue': 'spreadtest'
            }, (function(index) {
                return function() {
                    received[index] += 1;
                };
            }(i)));
        }

        for (i = 0; i < total; i++) {
            nc.publish('foo.bar', 'ok');
        }

        nc.flush(function() {
            for (let i = 0; i < numSubscribers; i++) {
                Math.abs(received[i] - avg).should.be.below(allowedVariance);
            }
            nc.close();
            done();
        });
    });

    it('should deliver only one mesage to queue subscriber regardless of wildcards', function(done) {
        const nc = NATS.connect(PORT);
        let received = 0;
        nc.subscribe('foo.bar', {
            'queue': 'wcqueue'
        }, function() {
            received += 1;
        });
        nc.subscribe('foo.*', {
            'queue': 'wcqueue'
        }, function() {
            received += 1;
        });
        nc.subscribe('foo.>', {
            'queue': 'wcqueue'
        }, function() {
            received += 1;
        });
        nc.publish('foo.bar', function() {
            received.should.equal(1);
            nc.close();
            done();
        });
    });

    it('should deliver to multiple queue groups', function(done) {
        const nc = NATS.connect(PORT);
        let received1 = 0;
        let received2 = 0;
        const num = 10;

        nc.subscribe('foo.bar', {
            'queue': 'r1'
        }, function() {
            received1 += 1;
        });
        nc.subscribe('foo.bar', {
            'queue': 'r2'
        }, function() {
            received2 += 1;
        });

        for (let i = 0; i < num; i++) {
            nc.publish('foo.bar');
        }

        nc.flush(function() {
            received1.should.equal(num);
            received2.should.equal(num);
            nc.close();
            done();
        });
    });

});
