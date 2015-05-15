var Q = require('q');
var request = require('request');
var assert = require('assert');
var exec = require('child_process').exec
var execAndWait = Q.denodeify(exec);
var config = require('./config')
var promisify = require('./util').promisify

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
	  url:	"http://test:" + config["TEST-PASSWORD"] + "@" + config.host + "/api",
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

function* targetCalorieChangesArePersisted() {
	var response = yield makeAuthenticatedRequest({
		update: {
			targetCalories: 1500
		}
	});
	assert.deepEqual(response, {targetCalories: 1500});
	response = yield makeAuthenticatedRequest();
	assert.deepEqual(response, {targetCalories: 1500});
}

function* runTests() {
	yield* server.start();
	var allPassed = true;
	try {
		yield* unauthorizedRequestsAreDenied();
		yield* targetCalorieChangesArePersisted();
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

Q.spawn(runTests);
