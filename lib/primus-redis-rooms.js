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

		new Spark({
			sparkFn: primus.Spark,
			sparksTracker: primus.allSpark
		});
	}
}

module.exports = PrimusRedisRooms;