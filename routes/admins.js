var express = require('express');
var router = express.Router();
var sql = require("msnodesqlv8");
let path = require('path');
let fs = require('fs');
let inst = require('../config/inst.js');
let mysql = require("mysql2");
const passport = require('passport');
//require('./config/passport')(passport);

const authenticate = passport.authenticate('local-login', {session: true});

const connectionString = 
'Driver=SQL Server Native Client 11.0;DSN=SQLNative DSN;SERVER=erbd38;Database=erbd_ege_reg_19_38;Trusted_Connection=yes;';
const get_dbs_query = 'select dtb.name from master.sys.databases as dtb where dtb.name like \'%erbd%\''
const get_users_query = 'SELECT UserName ,UserFIO FROM [TRDB1].[dbo].[useUsers]'

const pool = mysql.createPool({
  host: "localhost",
  user: "admin",
  database: "ver_db",
  password: "Adminspassword"
});

router.all('/admin/*', authenticate, (req,res,next)=>{
  next();
});

router.get('/admin', (req, res)=>{
    res.render('admin', { title: 'Здесь вы можете проверить верификацию' });
  });

router.get('/settings', (req, res)=>{ 
  process.stdout.write("\033c");
  process.stdout.write("\033c");   
  //выгружать индексированный список с проверкой, есть ли всё ещё проект в папке или был удалён/изменён/перезапущен
  inst.dirTree('.\\projects');
  res.render('settings', { title: 'Здесь можно настроить всё',
    prs: inst.dirTree('.\\projects') });  
});0.

router.post('/settings',(req,res)=>{
  //при запуске запустить прогрессбар для резки проекта
  //указываем абсолютный путь к проекту и папкам с изображениями    
  try{
    //резка изображений
    //переадрессация должна работать на основе сессиии и вообще лучше через ajax подвтерждение резки сделать
    inst.getFiles(req.body['projects']) ? res.redirect('/admin/settings') : res.send("Ошибка в резке изображений").status('500');
  /*Получаем JSOn проекта со списком предметов внутри и порезанными изображениями
    Далее смотрим, есть ли файл со списком обработанных проектов, проверяем на существование только что обработанного и,
     либо записываем его, если не нашли, либо пропускаем эту часть*/
  } catch(e){
    throw 'myError:' + e;
  }
});

router.get('/verifycontrol', (req, res)=> { 
  /*
  Читаем файл с обработанными проектами и предметами, даём их клиенту, 
  чтобы тот смог выбрать, какой проект и предмет он собирается верифицировать
  */
  pool.execute("select distinct project_name from complete_projects", (err, prject)=>{
    if(err) {
      console.log(err + " result: " + prject);
      res.send("Ошибка в получении проектов: " + err).status(500);
    } else {
      pool.execute("select subject_code from complete_projects where project_name = " + '\''+prject[0].project_name+'\'', (err, subs)=>{
        if(err) return console.error(err);
        else {
          pool.execute("select answers.value as value ,count(answers.value) as count from answers where subject_code = " + subs[0].subject_code+ " group by(answers.value)", (err, imgs)=>{
            if(!err){             
              res.render('verifycontrol', { projects: prject, subjects: subs, imgs: JSON.stringify(imgs)});
              //res.status(200).send({projects: prject, subjects: subs, imgs: imgs});
            }
          })          
        }
      })
    }
  }); 

  //pool.end();
  
});

router.post('/verifycontrol/getSubjects', (req,res)=>{
  try{
    console.log('post /get subjects by admin: ' +  req.body.project_value);
    pool.execute("select subject_code from complete_projects where project_name = \"" + req.body.project_value + "\"", (err,result)=>{
      if(!err){
          res.status(200).send(result);
        }
    }) 
  } catch(err){
      throw err;
    }
});


router.post('/verifycontrol/getImages', (req,res)=>{
  try{
    console.log('post /get images by admin: ' +  req.body.subject_value + ', ' + req.body.project_value);
    pool.execute("select answers.value as value, count(answers.value) as count from answers where project_name = \""+ req.body.project_value +"\" and subject_code = " +  req.body.subject_value + " group by(answers.value)", (err, imgs)=>{
      if(!err){
        //console.log(imgs);
        res.status(200).send(imgs);
      } else{
        console.error('Ошибка: ' + err);
        res.status(500);
      }
    })
  } catch(err){
    console.error('Ошибка: ' + err);
  }
});

//временное решение
let temp_user_list_rows = ({UserFIO: 'a'},{UserName:'b'});
router.get('/user_list', (req, res)=> {
  //временное решение
  res.render('user_list', { title: 'Список пользователей', users: temp_user_list_rows});
  /*sql.query(connectionString,get_users_query,(err,rows) =s>{
    console.log(rows);
    res.render('user_list', { title: 'Список пользователей',
    users: rows});
    })*/
});

router.post('/verifycontrol/onhand', (req,res)=>{
    let str_vals = JSON.stringify(req.body.values).substring(1,JSON.stringify(req.body.values).length -1);
    console.log('post onhand ' + str_vals + 'pr: '+ req.body.project + ' sb: ' + req.body.subject);
    let values = [];
    //получение списка файлов для верификации
    pool.execute('select * from answers where value in ( ' + str_vals + ') and project_name = \'' + req.body.project + '\' and subject_code = ' + req.body.subject, (err,rows)=>{
      if(err){
        console.log('err: ' + err);
        res.status(500).send(err);
      } else {
        console.log('rows: ' + JSON.stringify(rows));
        res.status(200).send(rows);
      }
    });
    //обновление данных в бд, которые были взяты на контроль
    pool.execute('update answers set onhand = 1 where value in ( ' + str_vals + ') and project_name = \'' + req.body.project + '\' and subject_code = ' + req.body.subject, (err,rows)=>{
      if(err){
        console.log("Произошла ошибка в обновлении данных");
      }
    })
    /*for(i = 0; i < req.body.values.length;i++){
      console.log('req.body.values[i]: ' + req.body.values[i] +'; pr: ' +  req.body.project + '; sb: ' + req.body.subject);
      pool.execute('select * from answers where value in ( \'' + req.body.values[i] + '\') and project_name = \'' + req.body.project + '\' and subject_code = ' + req.body.subject, (err,rows)=>{
        if(err){
          console.log('err: ' + err);
          res.status(500).send(err);
        } else {
          console.log('rows: ' + JSON.stringify(rows) + '; req.body.values[i]: ' + req.body.values[i]);
          values.push(JSON.stringify(rows));
        }
    })
  }*/
  //console.log('values: ' + values);
}); 

router.post('/verifycontrol/sendResult', (req,res)=>{
  console.log("req.body.result: " + req.body.result);
  pool.execute('update answers set onhand = 2, status in (\'' + req.body.result + '\') where id in (\''+ req.body.id +'\') ', (err,rows)=>{
    if(err){
      console.log("Произошла ошибка в обновлении данных");
    }
  })
})

module.exports = router;