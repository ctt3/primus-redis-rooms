'use strict';

const 	uuid = require('node-uuid'),
		Spark = require('./spark');

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

		this.sparks = {};

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
			else if (chunk.action === 'setSparkData' && chunk.sparkId && chunk.sparkData) {
				self.setSparkData(chunk.sparkId, chunk.sparkData);
			}
			else if (chunk.action === 'emit' && chunk.sparkId && chunk.event && chunk.data) {
				self.emit(chunk.sparkId, chunk.event, chunk.data);
			}
		});
	}

	addSpark(sparkId) {
		let sparkData = this.sparks[sparkId];
		if (!sparkData) {
			this.sparks[sparkId] = {};
		}
	}

	publishSparkArrived(sparkId) {
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'addSpark', sparkId: sparkId }));
	}

	removeSpark(sparkId) {
		let sparkData = this.sparks[sparkId];
		if (sparkData) {
			delete this.sparks[sparkId];
		}
	}

	publishSparkLeft(sparkId) {
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'removeSpark', sparkId: sparkId }));
	}

	setSparkData(sparkId, data) {
		let sparkData = this.sparks[sparkId];
		if (sparkData && typeof data === 'object') {
			this.sparks[sparkId] = data;
		}
	}

	publishSparkData(sparkId, data) {
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'setSparkData', sparkId: sparkId, sparkData: data }));
	}

	emit(sparkId, event, data) {
		let spark = this.primus.connections[sparkId];
		if (spark) {
			spark.write({emit: [event].concat(data)});
		}
	}

	publishEmit(sparkId, event, data) {
		this.redis.pub.publish(this.channel, JSON.stringify({ action: 'emit', sparkId: sparkId, event: event, data: data }));
	}
}

module.exports = allSpark;
