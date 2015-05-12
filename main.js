var koa = require('koa');
var app = koa();

app.use(function *(){
  this.body = 'Hello World';
});

console.log("Listening...");
app.listen(process.env.PORT || 8888);
