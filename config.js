var fs = require('fs');

if (process.env.PORT) {
	//production
	exports.port = process.env.PORT
	for (key in process.env) {
		exports[key] = process.env[key];
	}
	exports.host = "calcounter-dev.elasticbeanstalk.com";
} else {
	//local
	exports.port = 8888
	var ebconfig = fs.readFileSync('local.config');
	var configJSON = JSON.parse(ebconfig);
	configJSON.option_settings.forEach(function (option) {
		exports[option.option_name] = option.value;
	});
	exports.host = "localhost:" + exports.port;
}


