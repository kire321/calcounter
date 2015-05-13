var passport = require('koa-passport')
var BasicStrategy = require('passport-http').BasicStrategy;
var credentials = require('./credentials')
var user = { id: 1, username: 'test', password: credentials.TEST_PASSWORD };


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

debugger;
var FacebookStrategy = require('passport-facebook').Strategy
passport.use(new FacebookStrategy({
    clientID: credentials.FB_CLIENT_ID,
    clientSecret: credentials.FB_CLIENT_SECRET,
	callbackURL: 'http://calcounter-dev.elasticbeanstalk.com/auth/facebook/callback'
  },
  function(token, tokenSecret, profile, done) {
	console.log(profile);
    done(null, user)
  }
))

