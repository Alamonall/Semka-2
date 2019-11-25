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
let project_list = []; //список обработанных проектов
var limst;

router.get('/admin', (req, res, next)=>{
    res.render('admin', { title: 'Здесь вы можете проверить верификацию' });
  });

router.get('/settings', (req, res, next)=>{ 
  process.stdout.write("\033c");
  process.stdout.write("\033c");   
  //выгружать индексированный список с проверкой, есть ли всё ещё проект в папке или был удалён/изменён/перезапущен
  res.render('settings', { title: 'Здесь можно настроить всё',
    prs: inst.dirTree('.\\projects')});  
});

router.post('/settings',(req,res)=>{
  //при запуске запустить прогрессбар для резки проекта
  //указываем абсолютный путь к проекту и папкам с изображениями    
  /*if(fs.existsSync(path.join(__dirname,'../memory/') + 'data.json')){
    console.log('is this array?: ' + JSON.parse(project_list).isArray());
    project_list = fs.readFileSync(path.join(__dirname, '../memory/') + 'data.json');
    console.log('proj_list: ' + project_list);
    //console.log('file proj_list: ' + fs.readFileSync(path.join(__dirname, '../memory/') + 'data.json'));
  }*/

  //резка изображений, limst должна сериализоваться на сервере после выполнения getFiles 
  let pr_name = inst.getFiles(req.body['projects'], (err,ans)=>{
    if(err){
      console.error(err); 
    } 
  });
  //скорей всего всё это записывается в бд
  console.log('pr_name: ' + pr_name);
  fs.exists(path.join(__dirname,'..','memory/list_of_projects') + '.json', (exists)=>{
    if(exists){
      console.log('list of projects exists');
      let file = fs.readFileSync(path.join(__dirname,'..', 'memory/list_of_projects') + '.json');
      let data = JSON.parse(file);
      if(!inst.search(pr_name, data))
        {
          data.push({'pr_name': pr_name});
          fs.writeFileSync(path.join(__dirname,'..', 'memory/list_of_projects') + '.json', JSON.stringify(data));
        }
      //fs.appendFileSync(path.join(__dirname,'..', 'memory/list_of_projects') + '.json', JSON.stringify({'pr_name': pr_name}));
    } 
    else{
      fs.writeFileSync(path.join(__dirname,'..', 'memory/list_of_projects') + '.json', JSON.stringify({'pr_name': pr_name}));
    }
  });
  

//  var test = inst.testFunc('testFunc');
  //переадрессация должна работать на основе сессиии
  res.redirect('/admin/settings');

});


/*fs.readFile('results.json', function (err, data) {
    var json = JSON.parse(data)
    json.push('search result: ' + currentSearchResult)

    fs.writeFile("results.json", JSON.stringify(json))
})*/

//временное решение
let temp_rows = ['test2','test22','test1'], temp = ['test1','test2','test3'];

router.get('/verifycontrol', (req, res)=> {
  console.log('get /verifyconytol by admin: ' + limst);
  let pr = fs.readFileSync(path.join(__dirname, '..', '/memory/list_of_projects') + '.json');
  let pr_names = JSON.parse(pr);
  console.log('pr_names: '+ pr_names.length);
  //limst должна вытаскиваться из файла
  res.render('verifycontrol', { title: 'А здесь можно провести контроль верификации',
    projects: pr_names
  });    
  /*sql.query(connectionString,get_dbs_query,(err,rows) =>{
   // console.log(rows);
    if(err) 
      console.log(err);
    else 
      res.render('verifycontrol', { title: 'А здесь можно провести контроль верификации', dbs: rows});
  })  */
});

router.post('/verifycontrol',(res,req)=>{
  console.log('post /verifyconytol by admin');
  res.send({subjects: temp});
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