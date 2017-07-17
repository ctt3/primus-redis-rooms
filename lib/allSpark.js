'use strict';

const 	uuid = require('node-uuid');

class allSpark {
	constructor(options) {

		if (typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required');
		}

		const prefix = (options.redis.channel || 'primus') + '.';
		const pattern = prefix + '*';

		this.sparkIds = [];
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

			if (chunk.action === 'addSpark' && chunk.sparkId) {
				self.addSpark(chunk.sparkId);
			}
			else if (chunk.action === 'removeSpark' && chunk.sparkId) {
				self.removeSpark(chunk.sparkId);
			}
		});
	}

	addSpark(sparkId) {
		let index = this.sparkIds.indexOf(sparkId);
		if (index === -1) {
			this.sparkIds.push(sparkId);
		}
	}

	publishSparkArrived(sparkId) {
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'addSpark', sparkId: sparkId }));
	}

	removeSpark(sparkId) {
		let index = this.sparkIds.indexOf(sparkId);
		if (index !== -1) {
			this.sparkIds.splice(index, 1);
		}
	}

	publishSparkLeft(sparkId) {
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'removeSpark', sparkId: sparkId }));
	}

}

module.exports = allSpark;
