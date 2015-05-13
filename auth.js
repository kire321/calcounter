var passport = require('koa-passport')
var BasicStrategy = require('passport-http').BasicStrategy;

	  //Is it worth making a hard-to-guess password and hiding in a
	  //file that's not committed publicly? Probably not. We just need
	  //to be sure that the test user has no special permissions, and
	  //can only modify their own account.
var user = { id: 1, username: 'test', password: 'test' }

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


//var FacebookStrategy = require('passport-facebook').Strategy
//passport.use(new FacebookStrategy({
//    clientID: 'your-client-id',
//    clientSecret: 'your-secret',
//    callbackURL: 'http://localhost:' + (process.env.PORT || 3000) + '/auth/facebook/callback'
//  },
//  function(token, tokenSecret, profile, done) {
//    // retrieve user ...
//    done(null, user)
//  }
//))

