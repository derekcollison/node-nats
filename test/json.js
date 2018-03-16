/*
 * Copyright 2013-2018 The NATS Authors
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


var NATS = require('../'),
    nsc = require('./support/nats_server_control'),
    should = require('should');

describe('JSON payloads', function() {

    var PORT = 1423;
    var server;

    // Start up our own nats-server
    before(function(done) {
        server = nsc.start_server(PORT, done);
    });

    // Shutdown our server
    after(function(done) {
        nsc.stop_server(server, done);
    });


    it('should pub/sub with json', function(done) {
        var nc = NATS.connect({
            json: true,
            port: PORT
        });
        nc.subscribe('foo', function(msg, reply, subj, sid) {
            should.ok(typeof msg !== 'string');
            should.exist(msg.field);
            msg.field.should.be.equal('hello');
            should.exist(msg.body);
            msg.body.should.be.equal('world');
            nc.unsubscribe(sid);
            nc.close();
            done();
        });

        nc.publish('foo', {
            field: 'hello',
            body: 'world'
        });
    });

    it('should pub/sub fail not json', function(done) {
        var nc = NATS.connect({
            json: true,
            port: PORT
        });
        try {
            nc.publish('foo', 'hi');
        } catch (err) {
            nc.close();
            err.message.should.be.equal('Message should be a JSON object');
            done();
        }
    });

    it('should pub/sub array with json', function(done) {
        var nc = NATS.connect({
            json: true,
            port: PORT
        });
        nc.subscribe('foo', function(msg, reply, subj, sid) {
            should.ok(typeof msg !== 'string');
            msg.should.be.instanceof(Array).and.have.lengthOf(3);
            nc.unsubscribe(sid);
            nc.close();
            done();
        });

        nc.publish('foo', ['one', 'two', 'three']);
    });
});
