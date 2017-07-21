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

	primus.setDataOnSpark = function(sparkId, key, value) {
		if (primus.connections[sparkId]) {
			primus.connections[sparkId][key] = value;
		}
	};

	primus.findSparkByKeyValue = function (lookupKey, lookupValue) {
		let sparkIds = Object.keys(primus.connections),
			spark;
		for (var i=0; i < sparkIds.length; i++) {
			spark = primus.connections[sparkIds[i]];
			if (spark && spark[lookupKey] && spark[lookupKey] === lookupValue) {
				return spark;
			}
		}
		return undefined;
	};

	primus.getSparkId = function (lookupKey, lookupValue) {
		let sparkOnThisServer = primus.findSparkByKeyValue(lookupKey, lookupValue);
		if (sparkOnThisServer) {
			return sparkOnThisServer.id;
		}
		else {
			return primus.allSpark.pingRemoteSpark(lookupKey, lookupValue);
		}
	};

	primus.remoteEmit = function (lookupKey, lookupValue, event, data) {
		primus.allSpark.emit(lookupKey, lookupValue, event, data);
		primus.allSpark.publishEmit(lookupKey, lookupValue, event, data);
	};

	new Spark(primus.Spark);
};

// Hack so that you can `primus.use(require('primus-redis-rooms'))`.
PrimusRedisRooms.server = PrimusRedisRooms;
