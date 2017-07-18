'use strict';

const 	Rooms = require('./rooms'),
		Spark = require('./spark'),
		allSpark = require('./allSpark'),
		redis = require('redis'),
		sentinel = require('redis-sentinel');

class PrimusRedisRooms{
	constructor(primus, options){

		if (typeof options.redis !== 'object') {
			throw new TypeError('`options.redis` is required');
		}

		primus.getClient = function() {
			if (options.redis.sentinel) {
				return sentinel.createClient(
					options.redis.endpoints,
					options.redis.masterName,
					options.redis
				);
			}

			return redis.createClient(options.redis.port, options.redis.host, options.redis.options);
		};

		this.channel = options.redis.channel || 'primus';
		this.pub = options.redis.pub || primus.getClient();
		this.sub = options.redis.sub || primus.getClient();

		primus.rooms = new Rooms({
			redis: {
				pub: this.pub,
				sub: this.sub,
				channel: this.channel
			}
		});

		primus.room = function (name) {
			return this.rooms.room(name);
		};

		primus.allSpark = new allSpark({
			redis: {
				pub: this.pub,
				sub: this.sub,
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

PrimusRedisRooms.server = function (primus, options) {
	return new PrimusRedisRooms(primus, options);
}

module.exports = PrimusRedisRooms;
