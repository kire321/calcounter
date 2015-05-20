var promisify = require('./util').promisify;
var Q = require('q');

function modelFactory(keyFields, fields, tableName) {
	function model(args) {
		for (attr in fields) {
			this[attr] = args[attr];
		}
		this.toDynamoObject = function(fieldsToInclude) {
			var dynamoObject = {};
			for (var field in fields) {
				if (!fieldsToInclude || fieldsToInclude.indexOf(field) >= 0) {
					var type = fields[field];
					dynamoObject[field] = {};
					dynamoObject[field][type] = this[field].toString();
				}
			}
			return dynamoObject;
		}
		this.getKey = function() {
			return this.toDynamoObject(keyFields)
		};
	}

	model.tableName = tableName;
	model.fromDyanmoObject = function(awsObject) {
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
		return new model(standardObject);
	};

	return model;
}



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
			return Model.fromDyanmoObject(response.Item);
		});
		this.delete = Q.denodeify(function(key, callback) {
			var params = {
				TableName: Model.tableName,
				Key: key, 
			};
			dynamodb.deleteItem(params, callback);
		});
		this.put = Q.denodeify(function(object, callback) {
			var params = {
				TableName: Model.tableName,
				Item: object.toDynamoObject(), 
			};
			dynamodb.putItem(params, callback);
		});
		this.query = promisify(function* (extraParams) {
			var params = {
				TableName: Model.tableName,
				ConsistentRead: true
			};
			for (var key in extraParams) {
				params[key] = extraParams[key];
			}
			var response = yield Q.nbind(dynamodb.query, dynamodb)(params);
			return response.Items.map(Model.fromDyanmoObject);
		});
	}
	return Table;
})();

exports.Meal = modelFactory([
		"userID", "mealID"
		], {
			mealID: "N",
			userID: "N",
			date: "N",
			time: "N",
			description: "S",
			calories: "N"
		},  "calCounterUserData");

exports.User = (function() {

	var User = modelFactory("id", {
		id: "N",
		targetCalories: "N"
	}, "calCounterUserMetaData");

	var userMetadataTable = new Table(User);
	var userDataTable = new Table(exports.Meal);

	User.prototype.setTargetCalories = function* (newTargetCalories) {
		this.targetCalories = newTargetCalories;
		yield userMetadataTable.put(this);
	};
	User.prototype.putMeal = function* (meal) {
		meal.userID = this.id;
		yield userDataTable.put(meal);
	};
	User.prototype.deleteMeal = function* (id) {
		var meal = new exports.Meal({userID: this.id, mealID: id});
		yield userDataTable.delete(meal.getKey());
	};

	//usually async methods that return a value use a closure to
	//access `self`, but we moved the closure we need to
	//`modelFactory`, so we make these functions instead of methods
	User.getMeals = promisify(function* (id) {
		var params = {
			KeyConditionExpression: "userID = :hashval", 
			ExpressionAttributeValues: {
				":hashval": {
					N: id.toString()
				}
			}
		};
		var response = yield userDataTable.query(params);
		return response;
	});
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
			yield* user.putMeal(new exports.Meal(body.upserts[i]));
		}
	}
	if ("deletes" in body && body.deletes.constructor === Array) {
		for(var i=0; i<body.deletes.length; i++) {
			yield* user.deleteMeal(body.deletes[i]);
		}
	}
	var meals = yield exports.User.getMeals(user.id);
	return {targetCalories: user.targetCalories, meals: meals};
});
