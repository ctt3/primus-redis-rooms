'use strict';

const 	Spark = require('./spark'),
		uuid = require('node-uuid');

class Sparks {
	constructor(options) {

		if (typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required');
		}

		const prefix = (options.redis.channel || 'primus') + '.';
		const pattern = prefix + '*';

		this.connections = [];
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

			if (chunk.action === 'add') {
				self.addSpark(chunk.spark);
			}
			else if (chunk.action === 'remove') {
				self.removeSpark(chunk.spark);
			}
		});
	}

	spark(primusSpark) {
		let self = this;

		let index = self.connections.indexOf(spark);
		if (index !== -1) {
			return self.connections[index];
		}

		let spark = new Spark({spark: primusSpark, redis: self.redis, channel: self.channel})
		self.connections.push(spark);
		spark.announceConnectionBegin();

		return spark;
	}

	addSpark(spark) {
		let index = this.connections.indexOf(spark);
		if (index === -1) {
			this.connections.push(spark);
		}
	}

	removeSpark(spark) {
		let index = this.connections.indexOf(spark);
		if (index !== -1) {
			this.connections.splice(index, 1);
		}
	}

}

module.exports = Sparks;