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
    let complete_project = inst.getFiles(req.body['projects']);
    let data_to_serialize = {"projects" : []};         //переменная для жонглирования данных под сериализацию
    /*
    {
      "project" : "project_name"
      "subjects": [
        {"sub" : 02},
        {"sub" : 01},
        {"sub" : 22},
      ],
      "project" : "project_name"
      "subjects": [
        {"sub" : 02},
        {"sub" : 01},
        {"sub" : 22},
      ]
    }
    *//*Получаем JSOn проекта со списком предметов внутри и порезанными изображениями
    Далее смотрим, есть ли файл со списком обработанных проектов, проверяем на существование только что обработанного и,
     либо записываем его, если не нашли, либо пропускаем эту часть*/
    fs.readFile(path.join(__dirname, '../memory/')+'list_of_projects.json',(err,file)=>{
      if(!err){
        data_to_serialize = JSON.parse(file);
        for(let i = 0; i< data_to_serialize.projects.length; i++){
          if(data_to_serialize.projects[i].project === complete_project.project){
            //Удаляем проект из готовых на тот случай, если его специально решили перезаписать
            delete(data_to_serialize.projects[i].project);
          }
        }
      }
      data_to_serialize.projects.push(complete_project);
      fs.writeFileSync(path.join(__dirname, '../memory/', ) + 'list_of_projects.json', JSON.stringify(data_to_serialize));      
    })

    //переадрессация должна работать на основе сессиии и вообще лучше через ajax подвтерждение резки сделать
    res.redirect('/admin/settings');
  } catch(e){
    throw 'myError:' + e;
  }
});

router.get('/verifycontrol', (req, res)=> { 
  /*
  Читаем файл с обработанными проектами и предметами, даём их клиенту, 
  чтобы тот смог выбрать, какой проект и предмет он собирается верифицировать
  */
  fs.readFile(path.join(__dirname, '../memory/') + 'list_of_projects.json', (err, data)=>{
    if(!err){
      let bbay = JSON.parse(data);
      res.render('verifycontrol', { title: 'А здесь можно провести контроль верификации',
          projects: bbay.projects, subjects: bbay.projects[0].subjects
      });    
    } else 
        res.sendStatus(500);      
  });

  /*sql.query(connectionString,get_dbs_query,(err,rows) =>{
   // console.log(rows);
    if(err) 
      console.log(err);
    else 
      res.render('verifycontrol', { title: 'А здесь можно провести контроль верификации', dbs: rows});
  })  */
});

router.post('/verifycontrol/get/subjects', (req,res)=>{
  try{
    console.log('post /get subjects by admin: ' +  req.body.project_value);
    fs.readFile(path.join(__dirname, '../memory/') + 'list_of_projects.json', (err, data)=>{
      if(!err){
        let bbay = JSON.parse(data);
        for(i in bbay.projects){
          if(bbay.projects[i].project === req.body.project_value){
            res.status(200).send(bbay.projects[i].subjects);
          }
        }      
      }
      else{
        res.status(500).send('cannot get the subjects of the project');
      }
    }
    );
  } catch(err){
  throw err;
}
});


router.post('/verifycontrol/get/images', (req,res)=>{
  console.log('post /get images by admin: ' +  req.body.subject_value);
  //path.join(__dirname, '..', '/memory/', + req.body['name'], '/list_of_answers.json')
  //let array_with_index = inst.getIndexesOfImages();
  res.status(200).send('done');
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