var wait=require('wait.for-es6');
var request = require('request');
var assert = require('assert');
var exec = require('child_process').exec;

function assertEqual(generator, left, right) {
	if (left !== right) {
		generator.throw(new Error(left + " != " + right));
	}
}

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
		yield wait.for(exec, "ps a -o pid= -o args= | grep 'sh -c node --harmony main.js' | xargs | cut -d ' ' -f 1 | xargs kill -9");
		yield wait.for(exec, "ps a -o pid= -o args= | grep 'node --harmony main.js' | xargs | cut -d ' ' -f 1 | xargs kill -9");
	}
}

function* testHelloWorld() {
	console.log("test");
	var response = yield wait.for(request.get, "http://localhost:8888") ;
	debugger;
	var body = response.body;
	assert.equal(body, "Hello World");
}

function* runTests() {
	yield wait.runGenerator(server.start);
	var allPassed = true;
	try {
		wait.launchFiber(testHelloWorld);
	} catch (error) {
		allPassed = false;
		throw error;
	} finally {
		yield wait.runGenerator(server.stop)
	}
	if (allPassed) {
		console.log("All tests passed.")
	}
}

wait.launchFiber(runTests);
