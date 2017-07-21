'use strict';

module.exports = function (Spark) {
	let initialise = Spark.prototype.initialise;

	Spark.prototype.initialise = function () {
		this._rooms = [];
		this.once('end', this.leaveAll);
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
};
