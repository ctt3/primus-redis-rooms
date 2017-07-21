'use strict';

const 	uuid = require('node-uuid');

const remotePongTimeoutms = 100;

class allSpark {
	constructor(options) {

		this.primus = options.primus;

		if (typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required');
		}

		const prefix = (options.redis.channel || 'primus') + '.';
		const pattern = prefix + '*';

		this.id = uuid.v4();
		this.redis = options.redis;
		this.redis.sub.psubscribe(pattern);
		this.channel = prefix + this.id;

		let self = this;

		this.redis.sub.on('pmessage', function (pattern_, channel, chunk) {
			if (pattern !== pattern_ || channel === self.channel) {
				// We already wrote to our own sparks.
				return;
			}

			try {
				chunk = JSON.parse(chunk);
			}
			catch (err) {
				throw new Error(err);
			}

			if (chunk.action === 'pingRemoteSpark' && chunk.lookupKey && chunk.lookupValue) {
				self.pongRemoteSpark(chunk.lookupKey, chunk.lookupValue, channel);
			}
			else if (chunk.action === 'pongRemoteSpark' && chunk.sparkId && chunk.requestingChannel === self.channel) {
				self.pongedSparkId = chunk.sparkId;
			}
			else if (chunk.action === 'emit' && chunk.lookupKey && chunk.lookupValue && chunk.event && chunk.data) {
				self.receiveRemoteEmit(chunk.lookupKey, chunk.lookupValue, chunk.event, chunk.data);
			}
			else if (chunk.action === 'join' && chunk.sparkLookupKey && chunk.sparkLookupValue && chunk.roomName) {
				self.receiveRemoteJoin(chunk.sparkLookupKey, chunk.sparkLookupValue, chunk.roomName);
			}
		});
	}

	pingRemoteSpark(lookupKey, lookupValue) {
		this.pongedSparkId = undefined;
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'pingRemoteSpark', lookupKey: lookupKey, lookupValue: lookupValue}));

		return new Promise(resolve => {
			setTimeout(() => {
				resolve(this.pongedSparkId);
			}, remotePongTimeoutms);
		});
	}

	pongRemoteSpark(lookupKey, lookupValue, requestingChannel) {
		let sparkOnThisServer = this.primus.findSparkByKeyValue(lookupKey, lookupValue);
		if (sparkOnThisServer) {
			this.redis.pub.publish(this.channel, JSON.stringify({ action: 'pongRemoteSpark', sparkId: sparkOnThisServer.id, requestingChannel: requestingChannel }));
		}
	}

	sendRemoteEmit(lookupKey, lookupValue, event, data) {
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'emit', lookupKey: lookupKey, lookupValue: lookupValue, event: event, data: data }));
	}

	receiveRemoteEmit(lookupKey, lookupValue, event, data) {
		let sparkOnThisServer = this.primus.findSparkByKeyValue(lookupKey, lookupValue);
		if (sparkOnThisServer) {
			sparkOnThisServer.write({emit: [event].concat(data)});
		}
	}

	sendRemoteJoin(sparkLookupKey, sparkLookupValue, roomName) {
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'join', sparkLookupKey: sparkLookupKey, sparkLookupValue: sparkLookupValue, roomName: roomName }));
	}

	receiveRemoteJoin(sparkLookupKey, sparkLookupValue, roomName) {
		let sparkOnThisServer = this.primus.findSparkByKeyValue(sparkLookupKey, sparkLookupValue);
		if (sparkOnThisServer) {
			let room = this.primus.room(roomName);
			sparkOnThisServer.join(room);
		}
	}
}

module.exports = allSpark;
