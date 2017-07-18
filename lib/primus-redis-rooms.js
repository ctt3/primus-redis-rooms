'use strict';

const 	Rooms = require('./rooms'),
		Spark = require('./spark'),
		allSpark = require('./allSpark');

class PrimusRedisRooms{
	constructor(primus, options){

		if (typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required');
		}

		this.channel = options.redis.channel || 'primus';

		primus.rooms = new Rooms({
			redis: {
				pub: options.redis.pub,
				sub: options.redis.sub,
				channel: this.channel
			}
		});

		primus.room = function (name) {
			return this.rooms.room(name);
		};

		primus.allSpark = new allSpark({
			redis: {
				pub: options.redis.pub,
				sub: options.redis.sub,
				channel: this.channel
			}
		});

		primus.getSparkData = function (sparkId) {
			if (sparkId) {
				return this.allSpark.sparks[sparkId];
			}
			else {
				return this.allSpark.sparks;
			}
		};

		primus.setSparkData = function (sparkId, data) {
			if (sparkId) {
				this.allSpark.setSparkData(sparkId, data);
				this.allSpark.publishSparkData(sparkId, data);
			}
		}

		new Spark({
			sparkFn: primus.Spark,
			sparksTracker: primus.allSpark
		});
	}
}

// PrimusRedisRooms.server = function (primus, options) {
// 	console.log(primus, options);
// 	return new PrimusRedisRooms(primus, options);
// }

PrimusRedisRooms.server = PrimusRedisRooms;
module.exports = PrimusRedisRooms;