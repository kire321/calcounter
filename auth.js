var Q = require('q')
var User = require('./dynamo').User
var passport = require('koa-passport')
var BasicStrategy = require('passport-http').BasicStrategy;
var credentials = require('./credentials')

passport.serializeUser(function(user, done) {
	debugger;
  done(null, user.id)
})

var deserializeUser = function(id, done) {
	var getUser = Q.async(User.get);
    getUser(id).then(function(user) {
	  done(null, user);
  }, function(error) {
	  done(error);
  });
};

passport.deserializeUser(deserializeUser);

passport.use(new BasicStrategy({
  },
  function(username, password, done) {
	if (username === "test" && password === credentials["TEST-PASSWORD"]) {
		deserializeUser(1, done);
	} else {
	    done(null, false);
	}
  }
));

var FacebookStrategy = require('passport-facebook').Strategy;
passport.use(new FacebookStrategy({
    clientID: credentials["FB-CLIENT-ID"],
    clientSecret: credentials["FB-CLIENT-SECRET"],
	callbackURL: 'http://calcounter-dev.elasticbeanstalk.com/auth/facebook/callback'
  },
  function(token, tokenSecret, profile, done) {
	deserializeUser(profile.id, done);
  }
))

