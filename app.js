var createError = require('http-errors');//??
var express = require('express');
var path = require('path');
var logger = require('morgan'); //??
var cookieParser = require('cookie-parser'); //??

let flash = require('connect-flash');
let bodyParser = require('body-parser');
//let sharp = require('sharp');

var adminsRouter = require('./routes/admins');
var usersRouter = require('./routes/users');
//let passport = require('./config/passport');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

let session = require('express-session');
let Store = require('express-session').Store //??
let BetterMemoryStore = require(__dirname + '/memory')
let store = new BetterMemoryStore({expires: 60*60*1000, debug: true});
app.use(session({
  name: 'hrsession',
  secret: 'hrsecret',
  store: store,
  resave: true,
  saveUninitialized: true
}));


app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//app.use('/',indexRouter);
app.use('/admin/', adminsRouter);
app.use('/user/', usersRouter);

/*app.use(passport.initialize());
app.use(passport.session());*/
app.use(flash());

app.get('/', function(req, res) { 
  /*sharp('./in.tiff')
    .resize(250,350)
    .toFile('./out.png',(err,info)=>{
      if(err) console.log(err);
    });*/
  
  res.render('index', { title: 'Есть? А Если найду?' });
});

app.post('/welcome', /*passport.authenticate('local',{
  failureRedirect: '/',
  failureFlash: true
}),*/(req,res)=>{
    req.flash('info','im in');
    res.render('welcome');
 });
 
// catch 404 and forward to error handler
app.use((req, res, next) =>{
  next(createError(404));
});

// error handler Важно держать в самом низу, иначе поймаёт всё, что не нужно!
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
