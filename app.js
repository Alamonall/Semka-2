const express = require('express'),
  path = require('path'),
  passport = require('passport') 
  require('./config/passport')(passport),
  logger = require('morgan'), //логи get и post запросов выдаёт в консоль 
  createError = require('http-errors'), //??
  flash = require('connect-flash'), // для подписей при неудачной авторизации
  bodyParser = require('body-parser'),
  session = require('express-session');

const app = express();

const userRouter = require('./routes/admin/user'); 

app.set('views', path.join(__dirname, 'views'));
app.set('public', path.join(__dirname, 'public'));
app.set('view engine', 'pug');

app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(bodyParser.json({ limit: '50mb' }));

app.use(logger('dev'));
app.use(session({
  secret: 'woot',
  rolling: true,
  resave: true,
  saveUninitialized: true,
  cookie: {maxAge: 300000} //3600000 for 1 hour
}));

app.use(express.static(path.join(__dirname, 'public')));

app.use('/private/', userRouter); 

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

app.use(function( req, res, next) { 
  res.locals.message = req.flash();
  next();
});

/*app.all('/admin/*', (req, res, next) => {
  if (req.isAuthenticated())    
    return next();  
  res.redirect('/');
});*/

app.all('private', mustAuth);
app.all('private/*', mustAuth);

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


function mustAuth(req, res, next){
  req.isAuthenticated()
    ? next()
    : res.redirect('/');
};

module.exports = app;