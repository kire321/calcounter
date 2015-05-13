var fs = require('fs');

var ebconfig = null;
try {
	ebconfig = fs.readFileSync('.ebextensions/secrets.config')
} catch (error) {}
if (ebconfig) {
	var configJSON = JSON.parse(ebconfig);
	configJSON.option_settings.forEach(function (option) {
		exports[option.option_name] = option.value;
	});
} else {
	for (key in process.env) {
		exports[key] = process.env[key];
	}
}
