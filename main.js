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
var serve = require('koa-static');
app.use(serve('static'));

var Router = require('koa-router')

var public = new Router()

var send = require('koa-send');
public.get('/', function* (next) {
  if (this.isAuthenticated()) {
	  yield send(this, __dirname + '/index.html');
  } else {
	  yield* passport.authenticate('facebook').call(this, next)
  }
})

public.get('/auth/facebook/callback',
  passport.authenticate('facebook', {
    successRedirect: '/',
    failureRedirect: '/auth_failed.html'
  })
)

app.use(public.middleware())

// Require authentication for now
app.use(function*(next) {
  if (this.isAuthenticated()) {
    yield next
  } else {
	  //if ('authorization' in this.request.headers) {
		  yield* passport.authenticate('basic').call(this, next)
	  //} else {
	  //    yield* passport.authenticate('facebook').call(this, next)
	  //}
  }
});

var secured = new Router()

var dynamo = require('./dynamo')
secured.post('/api', function* () {
	var promise = dynamo.api(this.req.user, this.request.body);
	promise.done();
	this.body = yield promise;
})

app.use(secured.middleware())

// start server
console.log("Listening...");
var config = require("./config");
app.listen(config.port);
