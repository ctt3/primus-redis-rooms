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

	client.on('data', function (data) {
		if (data.emit && data.emit.length) {
			client[data.emit[0]] = data.emit[1];
		}
	});

	client.id(function getID(id) {
		client['sparkId'] = id;
	});

	return client;
}

primus0 = getPrimus(PORT+1);
primus1 = getPrimus(PORT+2);

let remoteSparkId;

function sleep(ms = 0) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

let runTest = async function() {
	try {
		client0 = getClient(primus0); // Create a connection to first primus server
		await sleep(150);
		primus0.setDataOnSpark(client0.sparkId, 'userId', client0.sparkId);
		remoteSparkId = await primus1.getSparkId('userId', client0.sparkId); // Try to get spark Id of spark on another server
		assert.equal(remoteSparkId, client0.sparkId); // Assert that spark Id returned is client1's spark id

		client1 = getClient(primus1); // Create a connection to the second server
		await sleep(150);
		primus1.setDataOnSpark(client1.sparkId, 'userId', client1.sparkId);
		remoteSparkId = await primus0.getSparkId('userId', client1.sparkId); // Try to get spark Id of spark on another server
		assert.equal(remoteSparkId, client1.sparkId); // Assert that spark Id returned is client1's spark id

		remoteSparkId = await primus1.getSparkId('userId', "asdfg"); // Try to get spark Id of spark on another server, with nonsense key-value
		assert.equal(remoteSparkId, undefined); // Assert that spark Id returned is undefined, because the spark does not exist

		primus0.remoteEmit('userId', client1.sparkId, 'emitted', true); // Emit to a spark from a server that spark is not connected to.
		await sleep(150);
		assert.equal(client1.emitted, true); // Assert that the connected client got the message sent from the other server.

		primus1.remoteEmit('userId', client0.sparkId, 'emitted', true); // Emit to a spark from a server that spark is not connected to.
		await sleep(150);
		assert.equal(client0.emitted, true); // Assert that the connected client got the message sent from the other server.

		primus0.remoteJoin('userId', client1.sparkId, 'newRoom'); // Just making sure this doesn't explode...

		client0.end(); // Kill the connection to the first server
		await sleep(150);
		remoteSparkId = await primus1.getSparkId('userId', client0.sparkId); // Try to get spark Id of spark on another server, after that spark has disconnected
		assert.equal(remoteSparkId, undefined); // Assert that spark Id returned is undefined, because the spark is offline

		client1.end(); // Kill the connection to the second server
		await sleep(150);
		remoteSparkId = await primus0.getSparkId('userId', client1.sparkId); // Try to get spark Id of spark on another server, after that spark has disconnected
		assert.equal(remoteSparkId, undefined); // Assert that spark Id returned is undefined, because the spark is offline
	}
	catch (err) {
		console.log(err);
		process.exit(); // Complete - Test Failed.
	}

	process.exit(); // Complete - Test Passed.
}

runTest();
