const express = require('express');
const path = require('path');
const passport = require('passport');
  require('./config/passport')(passport);
const logger = require('morgan'); //логи get и post запросов выдаёт в консоль 
var createError = require('http-errors'); //??
const flash = require('connect-flash');// для подписей при неудачной авторизации
const bodyParser = require('body-parser');
var session = require('express-session');

const app = express();

const adminsRouter = require('./routes/admins');
const usersRouter = require('./routes/users');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(session(
  {cookie: {
     maxAge: 60000 }, 
  secret: 'woot',
  resave: true, 
  rolling: true,
  saveUninitialized: false})
);

app.use(bodyParser.urlencoded({
  extended: true,
  limit: '50mb'
}));
app.use(bodyParser.json({
  limit: '50mb'
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/admin/', adminsRouter);
app.use('/user/', usersRouter);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get('/', (req, res) => {
  req.flash('info','my bad, bad girlfriend!');
  res.render('index', {expressFlash: req.flash('info', 'my good, good girlfriend!') });
});
  
app.get('*/logout', (req, res) => {
  req.logout();
  res.redirect('/');
})

app.post('/', passport.authenticate('local-login', {
  failureRedirect: '/',
  failureFlash: true
}), (req, res) => {
  res.render('welcome', {
    user: req.user.username
  });
});



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

function mustAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return res.render('index');
  }
  next();
}

module.exports = app;