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
});

router.post('/settings',(req,res)=>{
  //при запуске запустить прогрессбар для резки проекта
  //указываем абсолютный путь к проекту и папкам с изображениями    

  try{
    //резка изображений
    const complete_project = inst.getFiles(req.body['projects']);   
    console.log('list of = ' + complete_project);
    fs.stat(path.join(__dirname, '..', '/memory/') + 'list_of_projects.json', (err)=>{
      if(!err)
      {
        const file = fs.readFileSync(path.join(__dirname, '..', '/memory/') + 'list_of_projects.json');
        const data = JSON.parse(file);
        data.push(complete_project);
        fs.writeFileSync(path.join(__dirname, '..', '/memory/') + 'list_of_projects.json', JSON.stringify(data));
      } else {
        const temp_array =  [];
        temp_array.push(complete_project);
        fs.writeFileSync(path.join(__dirname, '..', '/memory/') + 'list_of_projects.json', JSON.stringify(temp_array));
      }  
    }); 
  } catch(e){
    throw e;
  }
  //var test = inst.testFunc('testFunc');
  //переадрессация должна работать на основе сессиии и вообще лучше через ajax подвтерждение резки сделать
  res.redirect('/admin/settings');
});

router.get('/verifycontrol', (req, res)=> {
  fs.readFile(path.join(__dirname, '..', '/memory/') + 'list_of_projects.json', (err,data)=>{
    if(!err){
      let pr_names = JSON.parse(data);
      console.log('pr_names: '+ pr_names.length);
      //limst должна вытаскиваться из файла
      res.render('verifycontrol', { title: 'А здесь можно провести контроль верификации',
        projects: pr_names, subjects: []
      });    
    } else 
        throw err;
  });

  /*sql.query(connectionString,get_dbs_query,(err,rows) =>{
   // console.log(rows);
    if(err) 
      console.log(err);
    else 
      res.render('verifycontrol', { title: 'А здесь можно провести контроль верификации', dbs: rows});
  })  */
});

router.post('/verifycontrol', (req,res)=>{
  console.log('post /verifyconytol by admin');
  res.status(200).sendFile(path.join(__dirname, '..', '/memory/', + req.body['name'], '/list_of_answers.json'));
});

//временное решение
let temp_user_list_rows = ({UserFIO: 'a'},{UserName:'b'});
router.get('/user_list', (req, res, next)=> {
  //временное решение
  res.render('user_list', { title: 'Список пользователей', users: temp_user_list_rows});
  /*sql.query(connectionString,get_users_query,(err,rows) =s>{
    console.log(rows);
    res.render('user_list', { title: 'Список пользователей',
    users: rows});
    })*/
});

module.exports = router;