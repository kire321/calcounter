var Q = require('q');

exports.User = (function() {

	function User(id, targetCalories) {
		var self = this;
		this.id = id;
		this.targetCalories = targetCalories;
		this.setTargetCalories = function* (newTargetCalories) {
			self.targetCalories = newTargetCalories;
			mockDB[self.id] = new User(self.id, self.targetCalories);
		};
	}

	var mockDB = {1: new User(1, 1000)};

	User.get = function* (id) {
		var user = mockDB[id];
		if (!user) {
			user = new User(id, 1000);
			mockDB[id] = user;
		}
		return user;
	};

	return User;
})();

exports.api = Q.async(function *(user, body) {
	if ("update" in body) {
		var update = body.update;
		if ("targetCalories" in update) {
			yield* user.setTargetCalories(update.targetCalories);
		} else {
			console.trace("unknown update operation");
		}
	}

	return {targetCalories: user.targetCalories};
});
