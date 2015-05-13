var passport = require('koa-passport')
var BasicStrategy = require('passport-http').BasicStrategy;
var credentials = require('./credentials')
var user = credentials.user


passport.serializeUser(function(user, done) {
  done(null, user.id)
})

passport.deserializeUser(function(id, done) {
  done(null, user)
})

passport.use(new BasicStrategy({
  },
  function(username, password, done) {
	if (username === user.username && password === user.password) {
		return done(null, user);
	} else {
	    return done(null, false);
	}
  }
));


var FacebookStrategy = require('passport-facebook').Strategy
passport.use(new FacebookStrategy({
    clientID: credentials.facebookClientID,
    clientSecret: credentials.facebookClientSecret,
	callbackURL: 'http://calcounter-dev.elasticbeanstalk.com/auth/facebook/callback'
  },
  function(token, tokenSecret, profile, done) {
	console.log(profile);
    done(null, user)
  }
))

