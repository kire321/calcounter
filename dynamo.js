var Q = require('q');

exports.User = (function() {

	function User(id, targetCalories) {
		var self = this;
		this.id = id;
		this.targetCalories = targetCalories;
		this.save = function* () {
			mockDB[self.id] = new User(self.id, self.targetCalories);
		};
	
	}

	var mockDB = {1: new User(1, 1000)};

	User.get = function* (id) {
		return mockDB[id];
	};

	return User;
})();

exports.api = Q.async(function *(user, body) {
	return {targetCalories: user.targetCalories};
});