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
}).promise();

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
  let sql = "select distinct project_name from complete_projects order by 1";
  pool.execute(sql)
    .then(rows=>{
      console.log("rows: " + rows[0].length + " rows11: " + JSON.stringify(rows[0][0].project_name) + " rows2: " + JSON.stringify(rows[0][0]));
      res.render('verifycontrol', {projects: rows[0]});//, { projects: JSON.stringify(rows[0][0]), subjects: JSON.stringify(rows[0][0]), imgs: JSON.stringify(rows[0][0])});            
    })          
    .catch(err=>{
      res.send("Ошибка в получении проектов: " + err).status(500);
    }); 
  //pool.end();
});

router.post('/verifycontrol/getSubjects', (req,res)=>{
  try{
    console.log('post /get subjects by admin: ' +  req.body.project_value);
    pool.execute("select subject_code from complete_projects where project_name = \"" + req.body.project_value + "\"")
    .then(result=>{
      res.status(200).send(result[0]);
    })
    .catch(err=>{
      console.log(err);
    }) 
  } catch(err){
      throw err;
    }
});


router.post('/verifycontrol/getImages', (req,res)=>{
  try{
    console.log('post /get images by admin: ' +  req.body.subject_value + ', ' + req.body.project_value);
    pool.execute("select answers.value as value, count(answers.value) as count from answers where onhand in (0,2) and project_name = \""+ req.body.project_value +"\" and subject_code = " +  req.body.subject_value + " group by(answers.value)")
    .then(imgs=>{
        res.status(200).send(imgs[0]);
    })
    .catch(err=>{
        console.error('Ошибка: ' + err);
        res.status(500);
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
    console.log('post onhand: ' + str_vals + 'pr: '+ req.body.project + ' sb: ' + req.body.subject);
    let values = [];
    //получение списка файлов для верификации
    pool.execute('select * from answers where value in ( ' + str_vals + ') and project_name = \'' + req.body.project + '\' and subject_code = ' + req.body.subject)
      .then(rows=>{
        console.log('JSON.stringify(rows[0][0].status): ' + JSON.stringify(rows[0][0].idanswer));
        res.status(200).send(rows[0]);
        //обновление данных в бд, которые были взяты на контроль
        return pool.execute('update answers set onhand = 1 where value in ( ' + str_vals + ') and project_name = \'' + req.body.project + '\' and subject_code = ' + req.body.subject);        
      })
      .catch(err=>{
        console.log('err: ' + err);
        res.status(500).send(err);
      })
 
}); 

router.post('/verifycontrol/sendResult', (req,res)=>{
  console.log('req.body.img_id: ' + req.body.img_ids[0] + '; req.body.status: ' + req.body.statuses[0]);
  pool.execute('update answers set onhand = 2, status = ? where idanswer = ?', req.body.statuses, req.body.img_ids)
    .then(()=>{
      console.log('where is my success?');
      res.status(200).send('Good boy!');
    })
    .catch(err=>{
      console.log("Произошла ошибка в обновлении данныx : " + err);
    });
})

module.exports = router;