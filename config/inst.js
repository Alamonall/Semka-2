let fs = require('graceful-fs')
let sharp = require('sharp');
let path = require('path');
let xml2js = require('xml2js');
let iconvlite = require('iconv-lite');

let xmlBuilder = require('xmlbuilder');

let parser = new xml2js.Parser({
  attrkey: 'ATTR'
});
const util = require('util');
const mysql = require('mysql2');
const async = require('async');
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);

let inst = {
  //возвращает список папок с проектами
  GetListProjectsForCutting: function () {
    let projectList = [];
    let dir = path.join(__dirname, '../public/projects');
    let list = fs.readdirSync(path.join(__dirname, '../public/projects'));
    for (let item of list) {
      if (fs.statSync(dir + '\\' + item).isDirectory()) {
        projectList.push('\t'.repeat(0) + item);
      }
    }
    return projectList;
  },
  //projects/dir/batches/00000000/

  ImageCutting: async function (projectName) {
    let dir = path.join(__dirname, '../public/projects/', projectName, '/batches/00000000');
    let pathsToTheAud = fs.readdirSync(dir);
    let listOfBlanks = []; //список бланков

    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      database: 'ver_db',
      password: 'Adminspassword',
    }).promise();

    //создание папки с проектом, если её нет
    await mkdir(path.join(__dirname, '../public/memory/', projectName), {
        recursive: true
      })
      .catch((err) => {
        console.log('err: ' + err);
      });

    for (let item of pathsToTheAud) {
      //выборка необходимых файлов с данными ддя резки и ответов
      let files = fs.readdirSync(dir + '\\' + item);
      for (let file of files) {
        if (file.match(/AB/)) {
          if (path.extname(file).match(/XML/)) {
            console.log('dir: ' + dir);
            console.log('item: ' + item);
            console.log('path.parse(file).name: ' + path.parse(file).name);
            listOfBlanks.push(path.join(item, path.parse(file).name));
          }
        }
      }
    }
    /*
        let asyncQueue = async.queue(function(task, callback){
          task(callback); 
        },1000);

        asyncQueue.drain(() => {
            console.log('Time in the end: ' + (Date.now() - timeInMs));
            console.log('all done');
            return true;
        })
    */
    for (let item of listOfBlanks) {
      let xmlString = readFileSync_encoding(path.join(dir, item) + '.XML', 'UTF-16'); //.replace(/\?\?/,'');

      //вытаскиваем из файлов необходимые данные
      parser.parseString(xmlString, (err, data) => {
        if (err)
          console.error('err in parseString : ' + err);
        //else{
        for (let i = 0; i < 75; i++) { // число 75 взято от бaлды, лучше будет придумать что-нибудь по-надёжнее 
          let page = data.batch.page[0].block[i];
          if (page._ && !(page.ATTR.blockName.match(/В\d\d/) === 'null' || page.ATTR.blockName.match(/В\d\d/) === null)) {
            console.log('item: ' + item);
            /*
              вставка данных в бд об обрезанном изображении
            */
            console.log('data.batch.page[0].block[5]._: ' + data.batch.page[0].block[5].blockName + ': '+ data.batch.page[0].block[5]._)

            let sql = 'insert into answers(`status`, `onhand`, `value`, `cropped_image`, `original_image`, `subject_code`, `project_name` , `task`)' +
              ' values(?, ? , ? , ? , ?, ? ,?, ?);'
            let insterts = [
              0,
              0,
              page._,
              '\\memory\\' + projectName + '\\images\\' + /*код предмета*/ data.batch.page[0].block[3]._ + '\\' +
              + /*штрих-код изображения*/ data.batch.page[0].block[1]._ + '\\' + data.batch.page[0].block[3]._ + '_' +
              path.parse(item).name + '_' + page.ATTR.blockName + '.png',
              '\\projects\\' + projectName + '\\batches\\00000000\\' + item + '.TIF',
              /*Код предмета*/
              data.batch.page[0].block[3]._,
              projectName,
              /*номер задания*/
              page.ATTR.blockName
            ];

            pool.execute(sql, insterts)
              .then(() => {
                pool.execute('select * from answers where project_name = \'' + projectName + '\' and subject_Code = \'' + data.batch.page[0].block[3]._ + '\' and task = \'' + page.ATTR.blockName + '\'')
                  .catch((err) => {
                    console.log('error in select * from answers ' + err.message);
                  });
              })
              .catch((err) => {
                console.log('error3: ' + err.message);
              });

            mkdir(path.join(__dirname, '../public/memory/', projectName, '/images/', data.batch.page[0].block[3]._, '/', /*штрих-код изображения*/
                data.batch.page[0].block[1]._ + '/'), {
                recursive: true
              })
              .then(() => {
                ImageCrop(item, data, page, projectName);
              })
              .catch((err) => {
                console.log('mkdir errror: ' + err);
              });


          }
        }

        /*Вставка инфы о проекте, изображения которого были успешно порезаны*/
        pool.execute('insert into complete_projects(project_name, subject_code) values(?,?)', [projectName, data.batch.page[0].block[3]._])
          .catch((err) => {
            console.log('error3: ' + err.message);
          });
      })
    }
  },
}

//резка изображений
async function ImageCrop(item, data, page, projectName) { 
  let croppedImage = path.join(__dirname, '../public/memory/', projectName, '/images/', data.batch.page[0].block[3]._, '/', /*штрих-код изображения*/
    data.batch.page[0].block[1]._ + '/') + data.batch.page[0].block[3]._ + '_' + path.parse(item).name + '_' + page.ATTR.blockName + '.png';

  await readFile(path.join(__dirname, '../public/projects/', projectName, '/batches/00000000/') + item + '.' + (item + '.TIF').match(/TIF|TIFF/))
    .then((originalImage) => {
      sharp(originalImage)
        .extract({
          'left': parseInt(page.ATTR.l, 10),
          'top': parseInt(page.ATTR.t, 10),
          'width': /*1071*/ parseInt(page.ATTR.r, 10) - parseInt(page.ATTR.l, 10),
          'height': /*92*/ parseInt(page.ATTR.b, 10) - parseInt(page.ATTR.t, 10)
        })
        .toFile(croppedImage)
        .then(() => {})
        .catch(err => {
          console.log('Error1 in toFile: ' + err.message + '; left: ' + parseInt(page.ATTR.l) + '; top: ' + parseInt(page.ATTR.t, 10) +
            '; width: ' + (parseInt(page.ATTR.r, 10) - parseInt(page.ATTR.l, 10)) + '; height: ' + (parseInt(page.ATTR.b, 10) - parseInt(page.ATTR.t, 10)) + '; \n original image: ' + item +
            '; cropped image: ' + croppedImage + '\n');
        });
    })
    .catch((err) => {
      console.log('err in imageCrop[]: ' + err);
    });
};

//функция для энкодинга 
function readFileSync_encoding(filename, enc) {
  let cont = fs.readFileSync(filename);
  return iconvlite.decode(cont, enc);
}

module.exports = inst;