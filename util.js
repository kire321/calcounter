var Q = require('q');

//Same api as Q.async, but with exception handling
exports.promisify = function(generator) {
	return function(/*arguments*/) {
		var deferred = Q.async(generator);
		var promise = deferred.apply(generator, arguments);
		promise.done();
		return promise;
	}
}
