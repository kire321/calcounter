var promisify = require('./util').promisify;
var Q = require('q');

var Table = (function() {

	var AWS = require('aws-sdk');
	AWS.config.region = 'eu-central-1';
	var dynamodb = new AWS.DynamoDB();

	function Table(Model) {
		var self = this;
		this.get = promisify(function* (key) {
			var params = {
				TableName: Model.tableName,
				Key: key, 
				ConsistentRead: true
			};
			var response = yield Q.nbind(dynamodb.getItem, dynamodb)(params);
			return self.standardizeAWSObject(response.Item);
		});
		this.put = Q.denodeify(function(object, callback) {
			var params = {
				TableName: Model.tableName,
				Item: object.getKey(), 
			};
			var i = 0;
			for (field in object.fields) {
				params.Item[field] = {};
				params.Item[field][object.fields[field]] = object[field].toString();
			}
			dynamodb.putItem(params, callback);
		});
		this.query = promisify(function* (extraParams) {
			var params = {
				TableName: "calCounterUserData",
				ConsistentRead: true
			};
			for (var key in extraParams) {
				params[key] = extraParams[key];
			}
			var response = yield Q.nbind(dynamodb.query, dynamodb)(params);
			console.log("query response");
			console.log(response);
			return response.Items.map(self.standardizeAWSObject);
		});

		this.standardizeAWSObject = function(awsObject) {
			if (!awsObject) {
				return null;
			}
			var standardObject = {};
			for (var field in awsObject) {
				var typeValue = awsObject[field];
				var type = Object.keys(typeValue)[0];
				var value = typeValue[type];
				if (type === 'N') {
					value = parseInt(value);
				}
				standardObject[field] = value;
			}
			return new Model(standardObject);
		};
	}
	return Table;
})();

exports.Meal = (function () {
	var attributes = [
		"mealID",
		"date",
		"time",
		"description",
		"calories"
	];

	var Meal = function(args) {
		debugger;
		var self = this;
		attributes.forEach(function (attr) {
			self[attr] = args[attr];
		});
		this.getKey = function () {
			return {
				userID: {
					N: self.userID.toString()
				},
				mealID: {
					N: self.mealID.toString()
				}
			}
		};
		this.fields = {
			date: "N",
			time: "N",
			description: "S",
			calories: "N"
		};
		this.preserialize = function () {
			var smaller = {};
			attributes.forEach(function (attr) {
				smaller[attr] = self[attr];
			});
			return smaller;
		};
	};

	Meal.tableName = "calCounterUserData";

	return Meal
})();

exports.User = (function() {

	function User(args) {
		var self = this;
		this.id = args.id;
		this.targetCalories = args.targetCalories;
		this.getKey = function () {
			return {
				id: {
					N: self.id.toString()
				}
			};
		};
		this.fields = {
			targetCalories: "N"
		};
		this.setTargetCalories = function* (newTargetCalories) {
			self.targetCalories = newTargetCalories;
			yield userMetadataTable.put(self);
		};
		this.putMeal = function* (meal) {
			meal.userID = this.id;
			yield userDataTable.put(meal);
		}
		this.getMeals = promisify(function* () {
			var params = {
				KeyConditionExpression: "userID = :hashval", 
				ExpressionAttributeValues: {
					":hashval": {
						N: self.id.toString()
					}
				}
			};
			var response = yield userDataTable.query(params);
			return response;
		});
	}

	User.tableName = "calCounterUserMetaData";

	User.get = function* (id) {
		var response = yield userMetadataTable.get((new User({id: id})).getKey());
		if (response) {
			return response;
		} else {
			var user = new User({id: id, targetCalories: 1000});
			yield userMetadataTable.put(user);
			return user;
		}
	};

	var userMetadataTable = new Table(User);
	var userDataTable = new Table(exports.Meal);

	return User;
})();


exports.api = promisify(function *(user, body) {
	if ("targetCalories" in body) {
		if (parseInt(body.targetCalories)) {
			yield* user.setTargetCalories(body.targetCalories);
		} else {
			console.trace("targetCalories must be a nonzero int");
		}
	}
	if ("upserts" in body && body.upserts.constructor === Array) {
		for(var i=0; i<body.upserts.length; i++) {
			debugger;
			yield* user.putMeal(new exports.Meal(body.upserts[i]));
		}
	}
	var meals = yield user.getMeals();
	var preserializedMeals = meals.map(function(item) {
		return item.preserialize()
	});
	return {targetCalories: user.targetCalories, meals: preserializedMeals};
});
