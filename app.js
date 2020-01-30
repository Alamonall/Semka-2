const express = require('express');
const path = require('path');

var logger = require('morgan'); //??
var createError = require('http-errors');//??

const cookieParser = require('cookie-parser'); //??
const flash = require('connect-flash');
const session = require('express-session');
//let Store = require('express-session').Store //??
const BetterMemoryStore = require(__dirname + '/memory')
const store = new BetterMemoryStore({expires: 60*60*1000, debug: true});

const bodyParser = require('body-parser');
//let sharp = require('sharp');

const adminsRouter = require('./routes/admins');
const usersRouter = require('./routes/users');
const passport = require('passport');
require('./config/passport')(passport);

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(session({
  name: 'hrsession',
  secret: 'hrsecret',
  store: store,
  resave: true,
  saveUninitialized: true
}));

app.use(logger('dev'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
 
app.use('/admin/', adminsRouter);
app.use('/user/', usersRouter);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.get('/', mustAuthenticated, (req, res)=> { 
  res.render('welcome', {user: req.user.username});
});

app.get('*/logout', (req,res)=>{
  req.logout();
  res.redirect('/');
})

app.post('/', passport.authenticate('local-login',{
  failureRedirect: '/',
  failureFlash: true
}),(req,res)=>{ 
    res.render('welcome', {user: req.user.username});
 });
 
// catch 404 and forward to error handler
app.use((req, res, next) =>{
  next(createError(404));
});

// error handler Важно держать в самом низу, иначе поймаёт всё, что не нужно!
app.use((err, req, res, next)=> {
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
