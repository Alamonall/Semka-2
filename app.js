const express = require('express');
const path = require('path');
const passport = require('passport');
require('./config/passport')(passport);
const logger = require('morgan'); //логи get и post запросов выдаёт в консоль 
const  createError = require('http-errors'); //??
const flash = require('connect-flash'); // для подписей при неудачной авторизации
const bodyParser = require('body-parser');
const session = require('express-session');

const app = express();

const adminsRouter = require('./routes/admin/admins');
const usersRouter = require('./routes/user/users');

app.set('views', path.join(__dirname, 'views'));
app.set('public', path.join(__dirname, 'public'));
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb'
}));
app.use(bodyParser.json({
  limit: '50mb'
}));

app.use(logger('dev'));
app.use(session({
  secret: 'woot',
  resave: true,
  rolling: true,
  saveUninitialized: false,
  cookie: {maxAge: 300000} //3600000 for 1 hour
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/admin/', adminsRouter);
app.use('/user/', usersRouter);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());


app.all('/admin/*', (req, res, next) => {
  console.log('req.isAuthenticated(): ' + req.isAuthenticated());
  if (req.isAuthenticated())    
    return next();  
  res.redirect('/');
});

app.get('/', (req, res) => {
  res.render('index');
});

app.post('/login', passport.authenticate('local-login', {  
  failureRedirect: '/',
  failureFlash: true
}), (req,res)=>{
  res.render('home', {
    user: !!req.user ? req.user : 'none' //req.session.passport.user
  });
});

app.get('*/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

// catch 404 and forward to error handler
app.use((req, res, next) => {
  next(createError(404));
});

// error handler Важно держать в самом низу, иначе поймаёт всё, что не нужно!
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;