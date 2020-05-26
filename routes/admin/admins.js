const express = require('express');
const router = express.Router();
const cutter = require('../../config/cutter.js')
const inst = require('../../config/inst.js');
const excelExporter = require('../../config/excelExporter.js');

const mysql = require("mysql2");

let _imagePool = 500;

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "ver_db",
  password: "Adminspassword"
}).promise();


function mustAuthenticated(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
};


router.all('/admin/*', mustAuthenticated, (req, res, next) => {
  res.send({
    user: !!req.user ? req.user : 'No One'
  });
  next();
});

router.get('/admin', mustAuthenticated, (req, res) => {
  let query = 'SELECT u.id as \'userId\', u.username as \'userName\', CONCAT(u.surname , \' \' , u.name , \' \' ,u.secondname) as \'fio\', u.privileges as \'privileges\', count(case when an.onhand = 1 then an.id else null end) as \'notFinishedAnswersCount\', count(case when an.onhand = 2 then an.id else null end) as \'finishedAnswersCount\', count(case when an.status = 1 then an.id else null end) as \'smallMistakeCount\',count(case when an.status = 2 then an.id else null end) as \'bigMistakeCount\' FROM users AS u LEFT JOIN answers AS an ON an.username = u.username group by u.id, u.username, u.surname ,  u.name ,u.secondname, u.privileges';
  pool.execute(query)
    .then(users =>
      res.render('admin', {
        users: users[0]
      })
    )
    .catch(err => {
      console.log('err: ' + err);
      res.status(500).send(err);
    });
});

router.post('/admin/clearNotFinishedData', mustAuthenticated, (req,res)=>{
  console.log('post(/admin/clearNotFinishedData(' + req.body.userName + ')');
  pool.execute('UPDATE ver_db.answers as a SET a.onhand = 0 where a.onhand = 1 and a.username = ?' , [req.body.userName])
    .then(() => {
      res.status(200).send('Счётчик для ' + req.body.userName + 'обнулён');
    })
    .catch(err => {
      console.log(err.message);
    });
});

router.get('/settings', mustAuthenticated, (req, res) => {
  process.stdout.write("\033c");
  process.stdout.write("\033c");

  pool.execute("select distinct project_name from complete_projects order by 1")
    .then(rows => {
      res.render('settings', {
        projectsToCut: inst.GetListProjectsForCutting(),
        completeProjects: rows[0],
        imagePool: _imagePool, 
        user: !!req.user ? req.user : req.session.passport.user
      });
    })
    .catch(err => {
      res.status(500).send(err.message);
    });
});

router.post('/settings/deleteProject', mustAuthenticated, (req, res) => {
  console.log('port /settings/deleteProject');
  pool.execute('delete from complete_projects, answers using complete_projects, answers where complete_projects.project_name = answers.project_name and project_name =\'' + req.body.projectName + '\'')
    .then(()=>{
      res.status(200).send('Проект удалён');
    }).catch((err) => {
      res.status(500).send('Что-то пошло не так и проект скорей всего не удалён' + err);
    }); 
 
});

router.post('/settings/cutProject', mustAuthenticated, async (req, res) => {
  //при запуске запустить прогрессбар для резки проекта
  //указываем абсолютный путь к проекту и папкам с изображениями      
  try {
    console.log('post /settings/cutProject req.body.projectToCut: ' + req.body.projectToCut);
    //резка изображений
    //переадрессация должна работать на основе сессии и вообще лучше через ajax подвтерждение резки сделать
    let completeProject;
    if(req.body.projectToCut){
      completeProject = await cutter.cutTheImages(req.body.projectToCut);
      res.status(200).send(completeProject);
      }
    else {
      res.status(500).send("Проблема с projectToCut, которая " + req.body.projectToCut);
      }
    
    /*Получаем JSOn проекта со списком предметов внутри и порезанными изображениями
      Далее смотрим, есть ли файл со списком обработанных проектов, проверяем на существование только что обработанного и,
       либо записываем его, если не нашли, либо пропускаем эту часть*/
  } catch (e) {
    throw 'myError:' + e;
  }
});

router.post('/settings/saveImagePool', mustAuthenticated, (req, res) => {
  console.log('post /settings/saveImagePool req.body.imagePool: ' + req.body.imagePool);
  _imagePool = req.body.imagePool;
  res.status(200).send('Image pool is saved');
})

router.post('/settings/exportToTheExcel',mustAuthenticated, async (req,res)=>{
  console.log('post of export to the excel');
  let work = await excelExporter.export(req.body.projectName);
  res.status(200).send(work);    
})

router.get('/verifycontrol', mustAuthenticated, (req, res) => {
  /*
  Читаем файл с обработанными проектами и предметами, даём их клиенту, 
  чтобы тот смог выбрать, какой проект и предмет он собирается верифицировать
  */
  pool.execute("select distinct project_name from complete_projects order by 1")
    .then(rows => {
      res.render('verifycontrol', {
        projects: rows[0],
        user: !!req.user ? req.user : req.session.passport.user
      });
    })
    .catch(err => {
      res.status(500).send("Ошибка: " + err);
    });
});

/*
Получение списка предметов для контроля верификации
*/
router.post('/verifycontrol/getSubjects', mustAuthenticated, (req, res) => {
  try {
    let timeInMs = Date.now();
    console.log('post /get subjects by admin: ' + JSON.stringify(req.body.projectName));
    pool.execute("select distinct cp.subject_code as subject_code, s.subject_name as subject_name from complete_projects as cp inner join subjects as s on s.subject_code = cp.subject_code where project_name = \"" + req.body.projectName + "\"")
      .then(result => {
        console.log('time for post /verifycontrol/getSubjects: ' + JSON.stringify(Date.now() - timeInMs) + 'милисекунд');
        res.status(200).send(result[0]);
      })
      .catch(err => {
        res.status(500).send(err);
      })
  } catch (err) {
    throw err;
  }
});

/*
Получение списка изображений на основе выбранного имени проекта и кода предмета
*/
router.post('/verifycontrol/getImages', mustAuthenticated, (req, res) => {
  let timeInMs = Date.now();
  console.log('post /get images by admin: ' + req.body.subjectCode + ', ' + req.body.projectName);
  pool.execute('select answers.value as value, count(answers.value) as count from answers where onhand = 0 and project_name = \'' + req.body.projectName + '\' and subject_code = ' + req.body.subjectCode + ' group by(answers.value) order by answers.value')
    .then(imgs => {
      console.log('time for post /verifycontrol/getImages: ' + JSON.stringify(Date.now() - timeInMs));
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
router.post('/verifycontrol/onhand', mustAuthenticated, (req, res) => {
  /*
   counterOfValue - Значение (количество значений)
  */
  let counterOfValue = JSON.stringify(req.body.values).substring(1, JSON.stringify(req.body.values).length - 1);
  console.log('post onhand: ' + counterOfValue + 'pr: ' + req.body.projectName + ' sb: ' + req.body.subjectCode + '; user: ' + req.session.passport.username);
  let timeInMs = Date.now();

  //получение списка файлов для верификации
  pool.execute('select distinct * from answers where value in ( ' + counterOfValue + ') and project_name = \'' + req.body.projectName + '\' and subject_code = ' + req.body.subjectCode + ' and onhand = 0 order by value limit ' + _imagePool)
    .then(rows => {
      console.log('successfully select data');
      console.log('user: ' + req.session.passport.user + '; time for post /verifycontrol/onhand: ' + JSON.stringify(Date.now() - timeInMs));
      res.status(200).send(rows[0]);
      //обновление данных в бд, которые были взяты на контроль
      pool.execute('update answers set onhand = 1, username = \'' + req.session.passport.user + '\' where value in ( ' + counterOfValue + ') and project_name = \'' + req.body.projectName + '\' and subject_code = ' + req.body.subjectCode + ' limit 500')
        .then(() => {
          console.log('succesfully update data')
        })
        .catch(err => {
          console.log('err: ' + err);
        })
    })
    .catch(err => {
      console.log('err: ' + err);
      res.status(500).send(err);
    })

});

router.post('/verifycontrol/sendResult', mustAuthenticated, (req, res) => {
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