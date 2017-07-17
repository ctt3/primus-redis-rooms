'use strict';

module.exports = function (options) {
	let Spark = options.spark;
	Spark.pub = options.redis.pub;
	Spark.channel = options.channel;

	let initialise = Spark.prototype.initialise;

	Spark.prototype.initialise = function () {
		this._rooms = [];
		this.once('end', function () {
			this.leaveAll();
			this.announceConnectionEnd();
		});
		initialise.apply(this, arguments);
	};

	['join', 'leave', 'leaveAll'].forEach(function (key) {
		Spark.prototype[key] = function () {
			let args = [ arguments[0] ];
			let rooms = this.primus.rooms;
			args.unshift(this);
			return rooms[key].apply(rooms, args);
		};
	});

	Spark.prototype.announceConnectionBegin = function () {
		this.pub.publish(this.channel, JSON.stringify({ action: 'add', spark: this }));
	};

	Spark.prototype.announceConnectionEnd = function () {
		this.pub.publish(this.channel, JSON.stringify({ action: 'remove', spark: this }));
	};
};
