var sql = require("msnodesqlv8");
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;
var connectionString = 
'Driver=SQL Server Native Client 11.0;DSN=SQLNative DSN;SERVER=erbd38;Database=erbd_ege_reg_19_38;Trusted_Connection=yes;';
let get_user_query = 'SELECT UserID, [UserName] FROM [TRDB1].[dbo].[useUsers] where username not like \'%Deleted%\' and username = ';


passport.serializeUser((user,done)=>{
    done(null, user.UserID);
  });
  
  passport.deserializeUser((UserID, done)=> {
    done(null,UserID);
  });
  
  passport.use(new LocalStrategy({
    usernameField: 'username',
    passwordField: 'password',
    passReqToCallback: true
  },  
    (req, username, password, done)=>{
      if(username == 'admin' && password == 'admin')
        return done(null,{UserID: username})
      /*console.log("user: " + username + "; pass: " + password);
      if(!username || !password){ 
        console.log("Mess 7: username and pass is empty");
        return done(err, false,
          req.flash('Error', 'Введите логин и пароль'));
      }
      //test
      //sql.query(connectionString, get_user_query + '\'' + username +'\'', (err,rows)=>{
       // console.log("Mess 2 length: " + rows.length);
       // console.log("Mess 4: " + rows[0].UserName);
      //})
      //
      //console.log("qu: " + get_user_query + '\'' + username +'\'')
      sql.query(connectionString, 
        get_user_query + '\'' + username +'\'',
         (err,rows) =>{
            if(err) 
              return done(err, req.flash('Error',{message: err})); 
            if(!rows.length) 
              return done(null, false, req.flash('Error',{message: 'Нет такого'}));   
            if(!(password == 'admin'))
              return done(null, false, req.flash('Error', {message:'Пароль неверен'}));
            return done(null, rows[0]);
         });*/
    }
  ));


  
//проверка на авторизованность
var isAuthenticated = function(req,res,next){
    if(req.isAuthenticated) 
      return next();
    else {
      req.status(403).send('Не авторизован');
      res.redirect('/');
    }
  }

module.exports = passport;