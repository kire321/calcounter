var wait=require('wait.for-es6');
var request = require('request');
var assert = require('assert');
var exec = require('child_process').exec;
var credentials = require('./credentials')

var server = new function() {

	this.child = null;

	this.isRunning = function(callback) {
		server.child.stdout.on("data", function (data) {
			if (data === "Listening...\n") {
				callback(null, data);
			}
		});
	}

	this.start = function* () {
		server.child = exec('npm start');
		server.child.stdout.on("data", function (data) {
			console.log(data);
		});
		server.child.stderr.on("data", function (data) {
			console.log(data);
		});
		yield wait.forMethod(server, "isRunning");
	}

	this.stop = function* () {
		//This is ugly and fragile. Why don't child processes get the signals I
		//send them?????
		//use a process manager?
		yield wait.for(exec, "ps a -o pid= -o args= | grep 'sh -c node --harmony main.js' | xargs | cut -d ' ' -f 1 | xargs kill -9");
		yield wait.for(exec, "ps a -o pid= -o args= | grep 'node --harmony main.js' | xargs | cut -d ' ' -f 1 | xargs kill -9");
	}
}

function* testUnauthorized() {
	var response = yield wait.for(request.get, "http://localhost:8888/api") ;
	var body = response.body;
	assert.equal(body, "Unauthorized");
}

function* testHelloWorld() {
	var response = yield wait.for(request.get, "http://test:" + credentials["TEST-PASSWORD"] + "@localhost:8888/api") ;
	var body = response.body;
	assert.equal(body, "Hello 1");
}

function* runTests() {
	yield* server.start();
	var allPassed = true;
	try {
		yield* testUnauthorized();
		yield* testHelloWorld();
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

wait.launchFiber(runTests);
