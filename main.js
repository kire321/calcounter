var koa = require('koa')
  , app = koa()

// trust proxy
app.proxy = true

// sessions
var session = require('koa-generic-session')
app.keys = ['your-session-secret']
app.use(session())

// body parser
var bodyParser = require('koa-bodyparser')
app.use(bodyParser())

// authentication
require('./auth')
var passport = require('koa-passport')
app.use(passport.initialize())
app.use(passport.session())

// public routes
var Router = require('koa-router')

//var public = new Router()

//public.get('/auth/facebook',
//  passport.authenticate('facebook')
//)
//
//public.get('/auth/facebook/callback',
//  passport.authenticate('facebook', {
//    successRedirect: '/app',
//    failureRedirect: '/'
//  })
//)

//app.use(public.middleware())

// Require authentication for now
app.use(function*(next) {
  var ctx = this
  if (this.isAuthenticated()) {
    yield next
  } else {
	  yield* passport.authenticate('basic', {session: false }, function*(err, user, info) {
		if (err) throw err
		if (user === false) {
		  ctx.status = 401
		} else {
		  yield next
		}
	  }).call(this, next)
  }
});

var secured = new Router()

secured.get('/', function*() {
  this.body = 'Hello World';
})

app.use(secured.middleware())

// start server
console.log("Listening...");
app.listen(process.env.PORT || 8888);
