var promisify = require('./util').promisify;
var Q = require('q');

var Table = (function() {
	var AWS = require('aws-sdk');
	AWS.config.region = 'eu-central-1';
	var dynamodb = new AWS.DynamoDB();

	function Table(tableName, pkName) {
		function createParams(key) {
			var keyObj = {};
			keyObj[pkName] = {N: key.toString()};
			return {
				TableName: tableName,
				Key: keyObj, 
			};
		};
		this.get = Q.denodeify(function(key, callback) {
			var params = createParams(key);
			params.ConsistentRead = true;
			dynamodb.getItem(params, callback);
		});
		this.put = Q.denodeify(function(key, field, value, callback) {
			var params = createParams(key);
			params.UpdateExpression = "set " + field + " = :value";
			params.ExpressionAttributeValues = {
				":value": {
					"N": value.toString()
				}
			};
			console.log(params.UpdateExpression);
			dynamodb.updateItem(params, callback);
		});
	}
	return Table;
})();

exports.User = (function() {

	function User(id, targetCalories) {
		var self = this;
		this.id = id;
		this.targetCalories = targetCalories;
		this.setTargetCalories = function* (newTargetCalories) {
			self.targetCalories = newTargetCalories;
			yield userDataTable.put(self.id, "targetCalories", self.targetCalories);
		};
	}

	var userDataTable = new Table("calCounterUserData", "id");
	User.get = function* (id) {
		var response = yield userDataTable.get(id);
		console.log(response);
		if (response.Item) {
			console.log("fetched a user");
			return new User(parseInt(response.Item.id.N), parseInt(response.Item.targetCalories.N));
		} else {
			console.log("created a user");
			var user = new User(id, 1000);
			yield userDataTable.put(user.id, "targetCalories", user.targetCalories);
			return user;
		}
	};

	return User;
})();

exports.api = promisify(function *(user, body) {
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
