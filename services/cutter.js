
const fs = require('graceful-fs')
const sharp = require('sharp');
const path = require('path');
const xml2js = require('xml2js');
const iconvlite = require('iconv-lite');

const util = require('util');
const mysql = require('mysql2');

const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);

module.exports.cutTheImages = async function (projectName) {
    let dir = path.join(__dirname, '../public/projects/', projectName, '/batches/00000000');
    let pathsToTheAud = fs.readdirSync(dir);
    let listOfBlanks = []; //список бланков
    let timeInMs = Date.now();

    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      database: 'ver_db',
      password: 'Adminspassword',
    }).promise();

    //создание папки с проектом, если её нет
    mkdir(path.join(__dirname, '../public/memory/', projectName), {
        recursive: true
      })
      .catch((err) => {
        console.log('err: ' + err);
      });

    for (let item of pathsToTheAud) {
      //выборка необходимых файлов с данными ддя резки и ответов
      let files = await fs.readdirSync(dir + '\\' + item);
      for (let file of files) {
        if (file.match(/AB/)) {
          if (path.extname(file).match(/XML/)) {
            listOfBlanks.push(path.join(item, path.parse(file).name));
          }
        }
      }
    }

    let allPromises = [];
    try {
      for (let item of listOfBlanks) {
        let xmlString = readFileSync_encoding(path.join(dir, item) + '.XML', 'UTF-16'); //.replace(/\?\?/,'');

        let parsedXml = await xml2js.parseStringPromise(xmlString, { attrkey: 'ATTR' }); //вытаскиваем из файлов необходимые данные

        for (let i = 0; i < 75; i++) { // число 75 взято от бaлды, лучше будет придумать что-нибудь по-надёжнее 

          let page = parsedXml.batch.page[0];

          if (page.block[i]._ && !(page.block[i].ATTR.blockName.match(/В\d\d/) === 'null' || page.block[i].ATTR.blockName.match(/В\d\d/) === null)) {

            await mkdir(path.join(__dirname, '../public/memory/', projectName, '/images/', page.block[3]._, '/', page.block[1]._ + '/'), {
              recursive: true
            }) /*штрих-код изображения: parsedXml.batch.page[0].block[1]._*/

            let croppedImage = path.join(__dirname, '../public/memory/', projectName, '/images/', page.block[3]._, '/', /*штрих-код изображения*/
              page.block[1]._ + '/') + page.block[3]._ + '_' + path.parse(item).name + '_' + page.block[i].ATTR.blockName + '.png';

            let originalImage = await readFile(path.join(__dirname, '../public/projects/', projectName, '/batches/00000000/') + item + '.' + (item + '.TIF').match(/TIF|TIFF/))

            let promise = await sharp(originalImage)
              .extract({
                'left': parseInt(page.block[i].ATTR.l, 10),
                'top': parseInt(page.block[i].ATTR.t, 10),
                'width': /*1071*/ parseInt(page.block[i].ATTR.r, 10) - parseInt(page.block[i].ATTR.l, 10),
                'height': /*92*/ parseInt(page.block[i].ATTR.b, 10) - parseInt(page.block[i].ATTR.t, 10)
              }).toFile(croppedImage)
              .catch(() => {
                //console.log('second chance');
                sharp(originalImage)
                  .extract({
                    'left': parseInt(page.block[i].ATTR.l, 10),
                    'top': parseInt(page.block[i].ATTR.t, 10),
                    'width': /*1071*/ parseInt(page.block[i].ATTR.r, 10) - parseInt(page.block[i].ATTR.l, 10),
                    'height': /*92*/ parseInt(page.block[i].ATTR.b, 10) - parseInt(page.block[i].ATTR.t, 10)
                  })
                  .toFile(croppedImage)
                  .catch(err => {
                    console.log('Error in toFile2: ' + err.message +
                      'l: ' + parseInt(page.block[i].ATTR.l) +
                      '; t: ' + parseInt(page.block[i].ATTR.t, 10) +
                      '; w: ' + (parseInt(page.block[i].ATTR.r, 10) - parseInt(page.block[i].ATTR.l, 10)) +
                      '; h: ' + (parseInt(page.block[i].ATTR.b, 10) - parseInt(page.block[i].ATTR.t, 10)) +
                      '; oi: ' + item + '; task: ' + page.block[i].ATTR.blockName + '\n');
                  });

              });
            allPromises.push(promise);

            /*
              вставка данных в бд об обрезанном изображении
            */
            let sql = 'insert into answers(`status`, `onhand`, `value`, `cropped_image`, `original_image`, `subject_code`, `project_name` , `task`)' +
              ' values(?, ? , ? , ? , ?, ? ,?, ?)';

            let inserts = [0, 0, page.block[i]._, '\\memory\\' + projectName + '\\images\\' + /*код предмета*/ page.block[3]._ + '\\' +
              + /*штрих-код изображения*/ page.block[1]._ + '\\' + page.block[3]._ + '_' + path.parse(item).name + '_' + page.block[i].ATTR.blockName + '.png',
              '\\projects\\' + projectName + '\\batches\\00000000\\' + item + '.TIF', /*Код предмета*/ page.block[3]._, projectName, /*номер задания*/ page.block[i].ATTR.blockName
            ];

            pool.execute(sql, inserts);

          }
        }
      }

      return await Promise.all(allPromises).then(() => {
        let promiseTime = Date.now() - timeInMs;
        console.log('done from console: ' + (promiseTime / 1000 / 60) + 'minutes');
        return projectName;
      });
    } catch (err) {
      console.log(err)
    }
  }


//функция для энкодинга 
function readFileSync_encoding(filename, enc) {
  let cont = fs.readFileSync(filename);
  return iconvlite.decode(cont, enc);
}