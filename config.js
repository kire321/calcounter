var fs = require('fs');

exports.port = process.env.PORT || 8888 

var ebconfig = null;
try {
	ebconfig = fs.readFileSync('local.config')
} catch (error) {}
if (ebconfig) {
	var configJSON = JSON.parse(ebconfig);
	configJSON.option_settings.forEach(function (option) {
		exports[option.option_name] = option.value;
	});
	exports.host = "localhost:" + exports.port;
} else {
	for (key in process.env) {
		exports[key] = process.env[key];
	}
	exports.host = "calcounter-dev.elasticbeanstalk.com";
}


