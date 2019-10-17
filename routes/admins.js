var express = require('express');
var router = express.Router();
var sql = require("msnodesqlv8");
let path = require('path');
let fs = require('fs');
let inst = require('../config/inst.js');

const connectionString = 
'Driver=SQL Server Native Client 11.0;DSN=SQLNative DSN;SERVER=erbd38;Database=erbd_ege_reg_19_38;Trusted_Connection=yes;';
const get_dbs_query = 'select dtb.name from master.sys.databases as dtb where dtb.name like \'%erbd%\''
const get_users_query = 'SELECT UserName ,UserFIO FROM [TRDB1].[dbo].[useUsers]'

router.get('/admin', function(req, res, next) {
    res.render('admin', { title: 'Здесь вы можете проверить верификацию' });
  });

router.get('/settings', function(req, res, next) { 
  process.stdout.write("\033c");
  process.stdout.write("\033c");   
  console.log("nodemon работает!" + inst.dirTree('.\\projects'));

  //выгружать индексированный список с проверкой, есть ли всё ещё проект в папке или был удалён/изменён/перезапущен
  res.render('settings', { title: 'Здесь можно настроить всё',
    prs: inst.dirTree('.\\projects')});  
});

router.post('/settings',(req,res)=>{
  //при запуске запустить прогрессбар для резки проекта
  //let form = document.forms[0];
  //let ageElems = form.elements.age;
  let arr = inst.getFiles(path.join(__dirname, '..', 'projects', req.body['projects'],'batches', '00000000')); //запуск резки
  res.send(arr);
  //res.send('Произошел админский троллинг: ' +  path.join(__dirname, '..', 'projects', req.body['projects'], 'batches','0000000'));
})

//временное решение
let temp_rows = ({name: '2'});
router.get('/verifycontrol', function(req, res, next) {
  //временное решение
  res.render('verifycontrol', { title: 'А здесь можно провести контроль верификации',
  dbs: temp_rows});
  
  /*sql.query(connectionString,get_dbs_query,(err,rows) =>{
   // console.log(rows);
    if(err) 
      console.log(err);
    else 
      res.render('verifycontrol', { title: 'А здесь можно провести контроль верификации', dbs: rows});
  })  */
});
//временное решение
let temp_user_list_rows = ({UserFIO: 'a'},{UserName:'b'});
router.get('/user_list', function(req, res, next) {
  //временное решение
  res.render('user_list', { title: 'Список пользователей', users: temp_user_list_rows});
  /*sql.query(connectionString,get_users_query,(err,rows) =s>{
    console.log(rows);
    res.render('user_list', { title: 'Список пользователей',
    users: rows});
    })*/
});

module.exports = router;