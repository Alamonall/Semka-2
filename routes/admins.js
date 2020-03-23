var express = require('express');
var router = express.Router();
var sql = require("msnodesqlv8");
let path = require('path');
let fs = require('fs');
let inst = require('../config/inst.js');
let mysql = require("mysql2");
const passport = require('passport');
//require('./config/passport')(passport);

const authenticate = passport.authenticate('local-login', {
  session: true
});

const connectionString =
  'Driver=SQL Server Native Client 11.0;DSN=SQLNative DSN;SERVER=erbd38;Database=erbd_ege_reg_19_38;Trusted_Connection=yes;';
const get_dbs_query = 'select dtb.name from master.sys.databases as dtb where dtb.name like \'%erbd%\''
const get_users_query = 'SELECT UserName ,UserFIO FROM [TRDB1].[dbo].[useUsers]'

const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  database: "ver_db",
  password: "Adminspassword"
}).promise();

router.all('/admin/*', authenticate, (req, res, next) => {
  next();
});

router.get('/admin', (req, res) => {
  res.render('admin', {
    title: 'Здесь вы можете проверить верификацию'
  });
});

router.get('/settings', (req, res) => {
  process.stdout.write("\033c");
  process.stdout.write("\033c");
  //выгружать индексированный список с проверкой, есть ли всё ещё проект в папке или был удалён/изменён/перезапущен
  inst.dirTree('.\\projects');
  res.render('settings', {
    title: 'Здесь можно настроить всё',
    prs: inst.dirTree('.\\projects')
  });
});
0.

router.post('/settings/cut', (req, res) => {
  //при запуске запустить прогрессбар для резки проекта
  //указываем абсолютный путь к проекту и папкам с изображениями      
  try {
    console.log('post /settings/cut req.body.project_to_cut: ' + req.body.project_to_cut);
    //резка изображений
    //переадрессация должна работать на основе сессиии и вообще лучше через ajax подвтерждение резки сделать
    req.body.project_to_cut ? 
      inst.getFiles(req.body.project_to_cut) ? res.redirect('/admin/settings') : res.status('500').send("Ошибка в резке изображений")
    : res.status('500').send("Проблема с project_to_cut, которая " + req.body.project_to_cut);
    /*Получаем JSOn проекта со списком предметов внутри и порезанными изображениями
      Далее смотрим, есть ли файл со списком обработанных проектов, проверяем на существование только что обработанного и,
       либо записываем его, если не нашли, либо пропускаем эту часть*/
  } catch (e) {
    throw 'myError:' + e;
  }
});

router.get('/verifycontrol', (req, res) => {
  /*
  Читаем файл с обработанными проектами и предметами, даём их клиенту, 
  чтобы тот смог выбрать, какой проект и предмет он собирается верифицировать
  */ 
  let timeInMs = Date.now();
  pool.execute("select distinct project_name from complete_projects order by 1")
    .then(rows => {
      //console.log("rows: " + rows[0].length + " rows11: " + JSON.stringify(rows[0][0].project_name) + " rows2: " + JSON.stringify(rows[0][0]));
      console.log('time for get /verifycontrol: ' + JSON.stringify(Date.now()- timeInMs));
      res.render('verifycontrol', {
        projects: rows[0]
      });            
    })
    .catch(err => {
      res.status(500).send("Ошибка в получении проектов: " + err);
    });
  //pool.end();
});

/*
Получение списка предметов для контроля верификации
*/
router.post('/verifycontrol/getSubjects', (req, res) => {
  try {
    let timeInMs = Date.now();
    console.log('post /get subjects by admin: ' + req.body.project_value);
    pool.execute("select distinct cp.subject_code as subject_code, s.subject_name as subject_name from complete_projects as cp inner join subjects as s on s.subject_code = cp.subject_code where project_name = \"" + req.body.project_value + "\"")
      .then(result => {
        console.log('time for post /verifycontrol/getSubjects: ' + JSON.stringify(Date.now()- timeInMs));
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
router.post('/verifycontrol/getImages', (req, res) => {
  let timeInMs = Date.now();
  console.log('post /get images by admin: ' + req.body.subject_value + ', ' + req.body.project_value);
  pool.execute('select answers.value as value, count(answers.value) as count from answers where onhand = 0 and project_name = \'' + req.body.project_value + '\' and subject_code = ' + req.body.subject_value + ' group by(answers.value) order by answers.value')
    .then(imgs => {
      console.log('time for post /verifycontrol/getImages: ' + JSON.stringify(Date.now()- timeInMs));
      res.status(200).send(imgs[0]);
    })
    .catch(err => {
      console.error('Promise-Ошибка: ' + err);
      res.status(500);
    }) 
});

/*
Получение списк пользователей
*/
router.get('/user_list', (req, res) => {
  pool.execute('select * from users')
    .then(rows =>
      res.render('user_list', {
        title: 'Список пользователей',
        users: rows[0]
      })
    )
    .catch(err => {
      console.log('err: ' + err);
      res.status(500).send(err);
    })
});
/*
Получение ответов для контроля верификации
*/
router.post('/verifycontrol/onhand', (req, res) => {
  let str_vals = JSON.stringify(req.body.values).substring(1, JSON.stringify(req.body.values).length - 1);
  console.log('post onhand: ' + str_vals + 'pr: ' + req.body.project + ' sb: ' + req.body.subject);
  let timeInMs = Date.now();
  //получение списка файлов для верификации
  pool.execute('select distinct * from answers where value in ( ' + str_vals + ') and project_name = \'' + req.body.project + '\' and subject_code = ' + req.body.subject + ' order by value limit 500 ')
    .then(rows => {
      console.log('successfully select data');
      console.log('time for post /verifycontrol/onhand: ' + JSON.stringify(Date.now()- timeInMs));
      res.status(200).send(rows[0]);
      //обновление данных в бд, которые были взяты на контроль
      pool.execute('update answers set onhand = 1 where value in ( ' + str_vals + ') and project_name = \'' + req.body.project + '\' and subject_code = ' + req.body.subject + ' limit 500')
        .then(()=>{console.log('succesfully update data')});
    })
    .catch(err => {
      console.log('err: ' + err);
      res.status(500).send(err);
    })

});

router.post('/verifycontrol/sendResult', (req, res) => {  
  console.log('post(/verifycontrol/sendResult');
  for (let i = 0; i < req.body.img_ids.length; i++) {
    console.log('req.body.img_ids: ' + req.body.img_ids[i] + '; req.body.status: ' + req.body.statuses[i]);
    pool.execute('update answers set onhand = 2, status = ? where id = ?', [req.body.statuses[i], req.body.img_ids[i]]) 
      .then(() => {
        pool.execute('select * from answers where status = ? and id = ?', [req.body.statuses[i], req.body.img_ids[i]])
          .then((rows) => {
            console.log('id: '+ JSON.stringify(rows[0][0].id) + '; value: ' + JSON.stringify(rows[0][0].value) + '; status: ' + JSON.stringify(rows[0][0].status) + '; onhand: ' + JSON.stringify(rows[0][0].onhand));
          })
          .catch(err => {
            console.log('Произошла ошибка при обновлении данныx : ' + err.message);
          });
      })
      .catch(err => {
        console.log('Произошла ошибка при обновлении данныx : ' + err.message);
      });
    //console.log('post(/verifycontrol/sendResult: req.body.img_ids: ' + req.body.img_ids[i] + '; req.body.status: ' + req.body.statuses[i]);
  }
  console.log('succesfully update data');
  res.status(200).send({ response: 'update was successfull' })
})

module.exports = router;