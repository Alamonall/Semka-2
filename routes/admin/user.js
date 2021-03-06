const express = require('express');
const router = express.Router();
const cutter = require('../../services/cutter.js')
const inst = require('../../services/inst.js');
const excelExporter = require('../../services/excelExporter.js');
const mysql = require("mysql2");
const passport = require('passport');

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "ver_db",
  password: "admin"
}).promise();


router.get('/admin', (req, res) => {
  let query = 'SELECT u.id as \'userId\', u.username as \'userName\', CONCAT(u.surname , \' \' , u.name , \' \' ,u.secondname) as \'fio\', u.privileges as \'privileges\', count(case when an.onhand = 1 then an.id else null end) as \'notFinishedAnswersCount\', count(case when an.onhand = 2 then an.id else null end) as \'finishedAnswersCount\', count(case when an.status = 1 then an.id else null end) as \'smallMistakeCount\',count(case when an.status = 2 then an.id else null end) as \'bigMistakeCount\' FROM users AS u LEFT JOIN answers AS an ON an.username = u.username group by u.id, u.username, u.surname ,  u.name ,u.secondname, u.privileges';
  pool.execute(query)
    .then(users =>
      res.render('admin', {
        users: users[0],
        user: !!req.user ? req.user : 'None'
      })
    )
    .catch(err => {
      console.log('err: ' + err);
      res.status(500).send(err);
    });
});

router.post('/admin/clearNotFinishedData', (req, res)=>{
  console.log('post(/admin/clearNotFinishedData(' + req.body.userName + ')');
  pool.execute('UPDATE ver_db.answers as a SET a.onhand = 0 where a.onhand = 1 and a.username = ?' , [req.body.userName])
    .then(() => {
      res.status(200).send('Счётчик для ' + req.body.userName + 'обнулён');
    })
    .catch(err => {
      console.log(err.message);
    });
});

router.get('/settings', (req, res) => {
  process.stdout.write("\033c");
  process.stdout.write("\033c");

  pool.execute("select distinct project_name from answers order by 1")
    .then(projects => {
      pool.execute('select value from config where name = \'max_image_pool\'')
        .then(imagePool => {
          res.render('settings', {
            projectsToCut: inst.GetListProjectsForCutting(),
            completeProjects: projects[0],
            imagePool: imagePool[0][0], 
            user: !!req.user ? req.user : 'None'
          });
        })
    })
    .catch(err => {
      res.status(500).send(err.message);
    });
});

router.post('/settings/deleteProject', (req, res) => {
  console.log('port /settings/deleteProject: ' + req.body.projectName);
  pool.execute('delete from answers where answers.project_name =\'' + req.body.projectName + '\'')
    .then(()=>{
      res.status(200).send('Проект удалён');
    }).catch((err) => {
      res.status(500).send('Что-то пошло не так и проект скорей всего не удалён' + err);
    }); 
 
});

router.post('/settings/cutProject', async (req, res) => {
  //при запуске запустить прогрессбар для резки проекта
  //указываем абсолютный путь к проекту и папкам с изображениями      
  try {
    console.log('post /settings/cutProject req.body.projectToCut: ' + req.body.projectToCut);
    //резка изображений
    //переадрессация должна работать на основе сессии и вообще лучше через ajax подвтерждение резки сделать
    let completeProject;
    if(req.body.projectToCut){
      completeProject = await cutter.cutTheImages(req.body.projectToCut, req.user);
      console.log('completeProject: ' + completeProject);
      res.status(200).send(completeProject);
      }
    else {
      console.log('Not Complete Project');
      res.status(500).send("Проблема с projectToCut, которая " + req.body.projectToCut);
      }
    
    /*Получаем JSOn проекта со списком предметов внутри и порезанными изображениями
      Далее смотрим, есть ли файл со списком обработанных проектов, проверяем на существование только что обработанного и,
       либо записываем его, если не нашли, либо пропускаем эту часть*/
  } catch (e) {
    throw 'myError:' + e;
  }
});

router.post('/settings/saveImagePool', (req, res) => {
  console.log('put /settings/saveImagePool req.body.imagePool: ' + req.body.imagePool);
  pool.execute('update ver_db.config set value = ? where name = \'max_image_pool\'',[req.body.imagePool])
    .then(()=>{
      res.status(200).send('Image pool is saved');
    })
    .catch((err)=>{
      res.status(500).send(err)
    })
  
})

router.post('/settings/exportToTheExcel', (req, res) => {
  try{
    console.log('post of export to the excel with ' + req.body.projectName);
    let query = "SELECT a.task as `Task`, '' as `Package`, case when a.status = 1 then 'Не грубая ошибка' when a.status = 2 then 'Грубая ошибка' end as `Status`, a.project_name as `Project`, '' as `Verificator`, a.username as `Controller`, u.surname as `Surname`, u.name as `Name`, u.secondname as `SecondName` FROM ver_db.answers as a inner join ver_db.users as u on u.username =  a.username where a.status in (1,2) and a.project_name = ? order by 1;";
    pool.execute(query, [req.body.projectName])
      .then((rows)=>{
        res.status(200).send(rows[0]);
      })
    /*excelExporter.export(req.body.projectName)
    .then((link) => {
      console.log('export: ' + link);  
      res.status(200).sendFile(link);
    })*/
    .catch((err) =>{
      console.log(err);
    })  
  }
  catch (e){
    console.log(e);
  }  
})

router.get('/verifycontrol', (req, res) => {
  /*
  Читаем файл с обработанными проектами и предметами, даём их клиенту, 
  чтобы тот смог выбрать, какой проект и предмет он собирается верифицировать
  */
  pool.execute("select distinct project_name from answers order by 1")
    .then(rows => {
      res.render('verifycontrol', {
        projects: rows[0],
        user: !!req.user ? req.user : 'None'
      });
    })
    .catch(err => {
      res.status(500).send("Ошибка: " + err);
    });
});

/*
Получение списка предметов для контроля верификации
*/
router.post('/verifycontrol/getSubjects', (req, res) => {
  let timeInMs = Date.now();
  console.log('post /get subjects by admin: ' + JSON.stringify(req.body.projectName));
  let sql = 'select distinct a.subject_code as \'subject_code\', s.subject_name as \'subject_name\', count(a.id) as \'count\' from ver_db.answers as a inner join ver_db.subjects as s on s.subject_code = a.subject_code where a.project_name = ? group by a.subject_code, s.subject_name order by 1;';
  pool.execute(sql, [req.body.projectName])
    .then(result => {
      console.log('time for post /verifycontrol/getSubjects: ' + JSON.stringify(Date.now() - timeInMs) + ' милисекунд');
      res.status(200).send(result[0]);
    })
    .catch(err => {
      res.status(500).send(err);
    })
});

/*
Получение списка изображений на основе выбранного имени проекта и кода предмета
*/
router.post('/verifycontrol/getImages', (req, res) => {
  console.log('post /getImages by admin: ' + req.body.subjectCode + ', ' + req.body.projectName);
  pool.execute('select answers.value as value, count(answers.value) as count from answers where onhand = 0 and project_name = \'' + req.body.projectName + '\' and subject_code = ' + req.body.subjectCode + ' group by(answers.value) order by answers.value')
    .then(imgs => {      
      res.status(200).send(imgs[0]);
    })
    .catch(err => {
      console.error('Promise-Ошибка: ' + err);
      res.status(500);
    })
});

/*
Получение ответов для контроля верификации
*/
router.post('/verifycontrol/onhand', (req, res) => {
  try{
    /*
    ValuesInOneString - Значение (количество значений)
    */
    console.log('post onhand: ' + req.body.values + '; pr: ' + req.body.projectName + '; sb: ' + req.body.subjectCode + '; user: ' + 'user448'/*req.session.passport.username*/);
    let timeInMs = Date.now();

    //получение списка файлов для верификации
    let incomingData = JSON.stringify(req.body.values).substring(1, JSON.stringify(req.body.values).length - 1);
    let sqlSelect = 'select distinct * from answers where value in (' + incomingData + ') and project_name = \'' + req.body.projectName + '\' and subject_code = ' + req.body.subjectCode + ' and onhand = 0 order by value limit 500' ;
    let sqlUpdate = 'update answers set onhand = 1, username = \'user448\' where value in (' + incomingData + ') and project_name = \'' + req.body.projectName + '\' and subject_code = ' + req.body.subjectCode + ' limit 500;'
    pool.execute(sqlSelect)
      .then((rows) => {
        console.log('successfully select data: ' + JSON.stringify(rows[0]));
        console.log('user: ' + 'user448'/*req.session.passport.user*/ + '; time for post /verifycontrol/onhand: ' + JSON.stringify(Date.now() - timeInMs));
        res.status(200).send(rows[0]);
        //обновление данных в бд, которые были взяты на контроль
        pool.execute(sqlUpdate)
          .then((rows) => {
            console.log('succesfully update data: ' + JSON.stringify(rows[0]));
          })
          .catch( err => console.log(err));
      })
      .catch(err => console.log(err));
  }
  catch(err){
    console.log('err: ' + err);
    res.status(500).send(err);
  }

});

router.post('/verifycontrol/sendResult', (req, res) => {
  console.log('post(/verifycontrol/sendResult: req.body.imageIds.length = ' + req.body.imageIds.length);
  for (let i = 0; i < req.body.imageIds.length; i++) {
    console.log('req.body.img_ids: ' + req.body.imageIds[i] + '; req.body.status: ' + req.body.statuses[i]);
    pool.execute('update answers set onhand = 2, status = ? where id = ?', [req.body.statuses[i], req.body.imageIds[i]])
      .then(() => {
        pool.execute('select * from answers where status = ? and id = ?', [req.body.statuses[i], req.body.imageIds[i]])
          .catch(err => {
            console.log('Произошла ошибка при обновлении данныx : ' + err.message);
          });
      })
      .catch(err => {
        console.log('Произошла ошибка при обновлении данныx : ' + err.message);
      });    
  }
  console.log('succesfully update data');
  res.status(200).send({
    response: 'update was successful'
  })

});

module.exports = router;