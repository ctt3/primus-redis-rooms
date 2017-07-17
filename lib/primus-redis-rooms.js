'use strict';

const 	Rooms = require('./rooms'),
		Sparks = require('./rooms');

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

		primus.clientConnections = new Sparks({
			redis: {
				pub: options.redis.pub,
				sub: options.redis.sub,
				channel: this.channel
			}
		});

		primus.allConnections = function() {
			return this.clientConnections.connections;
		};

		primus.clientConnection = function (connection) {
			return this.clientConnections.spark(connection);
		};

		return primus.clientConnection(primus.Spark);
	}
}

module.exports = PrimusRedisRooms;