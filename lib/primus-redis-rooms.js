'use strict';

const 	Rooms = require('./rooms'),
		Spark = require('./spark'),
		allSpark = require('./allSpark'),
		redis = require('redis'),
		sentinel = require('redis-sentinel');

let PrimusRedisRooms = module.exports = function (primus, options) {
	let self = this;

	if (typeof options.redis !== 'object') {
		throw new TypeError('`options.redis` is required');
	}

	self.redis = options.redis;
	self.channel = self.redis.channel || 'primus';

	primus.getClient = function() {
		if (self.redis.sentinel) {
			return sentinel.createClient(
				self.redis.endpoints,
				self.redis.masterName,
				self.redis
			);
		}

		return redis.createClient(self.redis.port, self.redis.host, self.redis.options);
	};

	self.pub = self.redis.pub || primus.getClient();
	self.sub = self.redis.sub || primus.getClient();

	primus.rooms = new Rooms({
		redis: {
			pub: self.pub,
			sub: self.sub,
			channel: self.channel
		}
	});

	primus.room = function (name) {
		return primus.rooms.room(name);
	};

	primus.allSpark = new allSpark({
		redis: {
			pub: self.pub,
			sub: self.sub,
			channel: self.channel
		},
		primus: primus
	});

	primus.getSparkData = function (sparkId) {
		if (sparkId) {
			return primus.allSpark.sparks[sparkId];
		}
		else {
			return primus.allSpark.sparks;
		}
	};

	primus.setSparkData = function (sparkId, data) {
		if (sparkId) {
			primus.allSpark.setSparkData(sparkId, data);
			primus.allSpark.publishSparkData(sparkId, data);
		}
	};

	primus.allSparkEmit = function (sparkId, event, data) {
		if (sparkId) {
			primus.allSpark.emit(sparkId, event, data);
			primus.allSpark.publishEmit(sparkId, event, data);
		}
	};

	new Spark({
		sparkFn: primus.Spark,
		sparksTracker: primus.allSpark
	});
};

// Hack so that you can `primus.use(require('primus-redis-rooms'))`.
PrimusRedisRooms.server = PrimusRedisRooms;
