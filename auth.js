var passport = require('koa-passport')
var BasicStrategy = require('passport-http').BasicStrategy;
var credentials = require('./credentials')
var testUser = { id: 1, username: 'test', password: credentials["TEST-PASSWORD"] };

passport.serializeUser(function(user, done) {
	debugger;
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  done(null, { id : id } )
})

passport.use(new BasicStrategy({
  },
  function(username, password, done) {
	if (username === testUser.username && password === testUser.password) {
		return done(null, testUser);
	} else {
	    return done(null, false);
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
	var fbUser = { id: profile.id }
    done(null, user)
  }
))

