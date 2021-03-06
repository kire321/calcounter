var Q = require('q');
var request = require('request');
var assert = require('assert');
var exec = require('child_process').exec;
var execAndWait = Q.denodeify(exec);
var config = require('./config');
var util = require('./util');
var promisify = util.promisify;
var randomInt = util.randomInt;
var Meal = require('./dynamo').Meal;

var server = new function() {

	this.child = null;

	this.isRunning = function() {
		var deferred = Q.defer();
		server.child.stdout.on("data", function (data) {
			if (data === "Listening...\n") {
				deferred.resolve();
			}
		});
		return deferred.promise;
	}

	this.start = function* () {
		server.child = exec('npm start');
		server.child.stdout.on("data", function (data) {
			console.log(data);
		});
		server.child.stderr.on("data", function (data) {
			console.log(data);
		});
		yield server.isRunning();
	}

	this.stop = function* () {
		//This is ugly and fragile. Why don't child processes get the signals I
		//send them?????
		//use a process manager?
		yield execAndWait("ps a -o pid= -o args= | grep 'sh -c node --harmony main.js' | xargs | cut -d ' ' -f 1 | xargs kill -9");
		yield execAndWait("ps a -o pid= -o args= | grep 'node --harmony main.js' | xargs | cut -d ' ' -f 1 | xargs kill -9");
	}
}

//something's wrong with Q.nbind
function post(specs) {
	var deferred = Q.defer();
	request.post(specs, function (error, response, body) {
		if (error) {
			deferred.reject(new Error(error));
		} else {
			deferred.resolve(response)
		}
	});
	return deferred.promise;
}

function* unauthorizedRequestsAreDenied() {
	var response = yield post("http://localhost:8888/api");
	var body = response.body;
	assert.equal(body, "Unauthorized");
}

var makeAuthenticatedRequest = promisify(function* (requestBody) {
	var requestSpecs = {
	  headers: {'content-type' : 'application/json'},
	  url:	"http://test:" + config.TEST_PASSWORD + "@" + config.host + "/api",
	  body: JSON.stringify(requestBody)
	}
	var response = yield post(requestSpecs);
	var body = null;
	try {
		body = JSON.parse(response.body);
	} catch (error) {
		body = response.body;
	}
	return body;
});

function* canChangeTargetCalories() {
	var targetCalories = randomInt(1000, 3000);
	var response = yield makeAuthenticatedRequest({
		targetCalories: targetCalories
	});
	assert.deepEqual(response.targetCalories, targetCalories);
	response = yield makeAuthenticatedRequest();
	assert.deepEqual(response.targetCalories, targetCalories);
}

function* deleteAllMeals() {
	var meals = (yield makeAuthenticatedRequest()).meals;
	var deletes = meals.map(function (meal) {
		return meal.mealID;
	});
	var response = yield makeAuthenticatedRequest({
		deletes: deletes
	});
	assert.deepEqual(response.meals, []);
}

function assertMealsEqual(left, right) {
	var fields = ["mealID", "date", "time", "description", "calories"];
	fields.forEach(function (field) {
		if (left[field] !== right[field]) {
			console.log(left);
			console.log(right);
		}
		assert.deepEqual(left[field], right[field]);
	});
}

function* canCreateMeal() {
	yield* deleteAllMeals();
	var meal = new Meal({mealID:randomInt(0,10000), date:1, time:1, description:"foo", calories:1000});
	var response = yield makeAuthenticatedRequest({
		upserts: [
			meal
		]
	});
	assertMealsEqual(response.meals[0], meal);
	response = yield makeAuthenticatedRequest();
	assertMealsEqual(response.meals[0], meal);
}

function* canStoreEmptyStrings() {
	yield* deleteAllMeals();
	var meal = new Meal({mealID:randomInt(0,10000), date:1, time:1, description:"", calories:1000});
	var response = yield makeAuthenticatedRequest({
		upserts: [
			meal
		]
	});
	assert.equal(response.meals[0].description, meal.description);
}

function* canFilter() {
	yield* deleteAllMeals();
	var meals = [
		new Meal({mealID:randomInt(0,10000), date:0, time:0, description:"", calories:1000}),
		new Meal({mealID:randomInt(0,10000), date:1, time:0, description:"", calories:1000}),
		new Meal({mealID:randomInt(0,10000), date:-1, time:0, description:"", calories:1000}),
		new Meal({mealID:randomInt(0,10000), date:0, time:-1, description:"", calories:1000}),
		new Meal({mealID:randomInt(0,10000), date:2, time:0, description:"", calories:1000}),
		new Meal({mealID:randomInt(0,10000), date:0, time:2, description:"", calories:1000})
	];
	var response = yield makeAuthenticatedRequest({
		upserts: meals,
		minDate: 0,
		maxDate: 1,
		minTime: 0,
		maxTime: 1
	});
	assertMealsEqual(response.meals[0], meals[0]);
	assertMealsEqual(response.meals[1], meals[1]);
	assert.equal(response.meals.length, 2);
}

function* runTests() {
	yield* server.start();
	var allPassed = true;
	try {
		yield* unauthorizedRequestsAreDenied();
		yield* canChangeTargetCalories();
		yield* canCreateMeal();
		yield* canStoreEmptyStrings();
		yield* canFilter();
	} catch (error) {
		allPassed = false;
		throw error;
	} finally {
		yield* server.stop()
	}
	if (allPassed) {
		console.log("All tests passed.")
	}
}

//Q.spawn(canCreateMeal);
//Q.spawn(canChangeTargetCalories);
Q.spawn(runTests);
