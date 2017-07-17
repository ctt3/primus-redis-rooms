'use strict';

const 	assert = require('assert'),
		cb = require('assert-called'),
		getPrimus = require('./helpers/get-primus.js');

let PORT = 3457;

var primus0, primus1, client0, client1;

function getClient(primus) {
	const client = new (primus.Socket)('http://localhost:' + primus.port);
	client.on('open', cb(function () { }));

	return client;
}

primus0 = getPrimus(PORT+1);
primus1 = getPrimus(PORT+2);

client0 = getClient(primus0);
setTimeout(function () {
	assert.equal(primus1.allSpark.sparkIds.length, 1);

	client1 = getClient(primus1);
	setTimeout(function () {
		assert.equal(primus0.allSpark.sparkIds.length, 2);

		client0.end();
		setTimeout(function () {
			assert.equal(primus1.allSpark.sparkIds.length, 1);

			client1.end();
			setTimeout(function () {
				assert.equal(primus0.allSpark.sparkIds.length, 0);
				process.exit();

			}, 100);
		}, 100);
	}, 100);
}, 100);
