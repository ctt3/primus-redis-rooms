'use strict';

const 	assert = require('assert'),
		cb = require('assert-called'),
		getPrimus = require('./helpers/get-primus.js');

let PORT = 3457;

var primus0, primus1, client0, client1;

function getClient(primus) {
	const client = new (primus.Socket)('http://localhost:' + primus.port);
	client.on('open', cb(function () {
		client._write('publishData', {'user': 1});
	}));

	client.id(function getID(id) {
		client['sparkId'] = id;
	});

	return client;
}

let userData = { 'user': 1 };

primus0 = getPrimus(PORT+1);
primus1 = getPrimus(PORT+2);

client0 = getClient(primus0); // Create a connection to first primus server
setTimeout(function () {
	assert.equal(Object.keys(primus1.getSparkData()).length, 1); // Assert connection record in second server

	primus1.setSparkData(client0.sparkId, userData); // Set connection data in the allSpark of second server & Publish the connection data to first server allSpark
	setTimeout(function() {
		assert.deepEqual(primus0.getSparkData(client0.sparkId), userData); // Assert connection data is the same in the first server allSpark

		client1 = getClient(primus1); // Create a connection to the second server
		setTimeout(function () {
			assert.equal(Object.keys(primus0.getSparkData()).length, 2); // Assert that the first server now has two connection records

			client0.end(); // Kill the connection to the first server
			setTimeout(function () {
				assert.equal(Object.keys(primus1.getSparkData()).length, 1); // Assert the second server now has one connection record

				client1.end(); // Kill the connection to the second server
				setTimeout(function () {
					assert.equal(Object.keys(primus0.getSparkData()).length, 0); // Assert that first server now has 0 connection records
					process.exit(); // Complete - Test Passed.

				}, 100);
			}, 100);
		}, 100);
	}, 100);
}, 100);
