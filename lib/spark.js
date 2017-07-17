'use strict';

module.exports = function (options) {
	let Spark = options.sparkFn,
		sparksTracker = options.sparksTracker,
		initialise = Spark.prototype.initialise;

	Spark.prototype.initialise = function () {
		sparksTracker.addSpark(this.id);
		sparksTracker.publishSparkArrived(this.id);

		this._rooms = [];

		this.once('end', function() {
			this.leaveAll();
			sparksTracker.removeSpark(this.id);
			sparksTracker.publishSparkLeft(this.id);
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
};
