let fs = require('graceful-fs')
let sharp = require('sharp');
let path = require('path');
let xml2js = require('xml2js');
let iconvlite = require('iconv-lite');

let xmlBuilder = require('xmlbuilder');

let parser = new xml2js.Parser({ attrkey: 'ATTR' });
const util = require('util');
const mysql = require('mysql2');
const async = require('async');
const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);

let inst = {
  //возвращает список папок с проектами
  GetListProjectsForCutting: function (dir) {
    let project_list = []; 
    let list = fs.readdirSync(dir);       
    for (let item of list) {
      if (fs.statSync(dir + '\\' + item).isDirectory()) {
        project_list.push('\t'.repeat(0) + item);
      }
    }  
    return project_list;
},
  //projects/dir/batches/00000000/

  ImageCutting: async function (project_name) {
    let timeInMs = Date.now();
    let dir = path.join(__dirname, '../projects/', project_name, '/batches/00000000');
    let paths_to_the_aud = fs.readdirSync(dir);
    let listOfBlanks = []; //список бланков

    const pool = mysql.createPool({
      host: 'localhost',
      user: 'root',
      database: 'ver_db',
      password: 'Adminspassword',
    }).promise();

    //создание папки с проектом, если её нет
    await mkdir(path.join(__dirname, '/memory/', project_name), { recursive: true})
      .catch((err)=>{
        console.log('err: ' + err);
      }); 

    for (let item of paths_to_the_aud) {
      //выборка необходимых файлов с данными ддя резки и ответов
      let files = fs.readdirSync(dir + '\\' + item); 
      for(let file of files)
      {
        if(file.match(/AB/)){ 
            if(path.extname(file).match(/XML/)){ 
              listOfBlanks.push(path.join(dir, item, path.parse(file).name));
          }
        }    
      }
    } 

    let asyncQueue = async.queue(function(task, callback){
      task(callback); 
    },1000);

    asyncQueue.drain(() => {
        console.log('Time in the end: ' + (Date.now() - timeInMs));
        console.log('all done');
        return true;
    })

    for(let item of listOfBlanks){
      //console.log('outfile: ' + path.join(__dirname, 'projects/images/') + path.parse(item).name + '_' + i + '.png');        
      let xml_string = readFileSync_encoding(item + '.XML', 'UTF-16');//.replace(/\?\?/,'');
      
      //вытаскиваем из файлов необходимые данные
      parser.parseString(xml_string, (err,data) => {
        if(err)
          console.error('err in parseString : ' + err);
        //else{
          for(let i = 0; i < 75; i++){ // число 75 взято от бaлды, лучше будет придумать что-нибудь по-надёжнее 
            let page = data.batch.page[0].block[i];     
            if(page._ && !(page.ATTR.blockName.match(/В\d\d/) === 'null' || page.ATTR.blockName.match(/В\d\d/) === null )){                
              /*console.log('item: ' + item);
              console.log('page._: ' + page._);
              console.log('page.ATTR.blockName.match(/В\d\d/): ' + page.ATTR.blockName.match(/В\d\d/));
              //проверка на существование папки предмета (например 1 - русский) с  ответом или её создание*/
              /*console.log('***************PARSING***************************************');
              console.log('data.batch.page[0].block[3]._: ' + data.batch.page[0].block[3]._);
              console.log('data.batch.page[0].block[31]._: ' + data.batch.page[0].block[31]._);
              console.log('data.batch.page[0].block[1]._: ' + data.batch.page[0].block[1]._);
              console.log('image: ' + '\\memory\\' + project_name + '\\images\\'+ data.batch.page[0].block[3]._ + '\\' + data.batch.page[0].block[1]._ + '\\' + data.batch.page[0].block[3]._ + '_' +
                path.parse(item).name + '_' + page.ATTR.blockName + '.png');
              console.log('')*/
              /*
                вставка данных в бд об обрезанном изображении
              */

              let sql = 'insert into answers(`status`, `onhand`, `value`, `cropped_image`, `original_image`, `subject_code`, `project_name` , `task`)' 
                +' values(?, ? , ? , ? , ?, ? ,?, ?);'
              let insterts = [
                0,
                0,
                page._ ,
                '\\memory\\' + project_name + '\\images\\'+ /*код предмета*/ data.batch.page[0].block[3]._ + '\\' +
                    + /*штрих-код изображения*/ data.batch.page[0].block[1]._ + '\\' + data.batch.page[0].block[3]._ + '_' +
                        path.parse(item).name + '_' + page.ATTR.blockName + '.png',
                /*полный путь к оригинальному изображению*/ item + '.TIF',
                /*Код предмета*/data.batch.page[0].block[3]._,
                project_name,
                /*номер задания*/ page.ATTR.blockName 
              ];    
              
              pool.execute(sql, insterts)
                .then(() =>{
                  pool.execute('select * from answers where project_name = \'' + project_name +'\' and subject_Code = \'' + data.batch.page[0].block[3]._+ '\' and task = \'' + page.ATTR.blockName + '\'')
                    .then(row => {
                      //console.log('row[0].value: ' + row[0]);
                    })
                    .catch((err)=>{
                      console.log('error in select * from answers ' + err.message);
                    })
                })
                .catch((err)=>{
                  console.log('error3: ' + err.message);
                });

              mkdir(path.join( __dirname, '../public/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/', /*штрих-код изображения*/ 
                data.batch.page[0].block[1]._+ '/'), {recursive: true })
                .then(()=>{                      
                  asyncQueue.push(ImageCrop(item, data, page, project_name))
                    .catch((err)=>{
                      console.log('error in asyncQueue: ' + err);
                    });
                })
                .catch((err)=>{
                  console.log('mkdir errror: ' + err);
                });
            
            }
          } 

          /*Вставка инфы о проекте, изображения которого были успешно порезаны*/            
          pool.execute('insert into complete_projects(project_name, subject_code) values(?,?)', [project_name, data.batch.page[0].block[3]._])
            .catch((err)=>{
              console.log('error3: ' + err.message);
            });
      })
    }  
  }, 
}
 
//резка изображений
function ImageCrop(item, data, page, project_name){
  return async function(callback){
    /*console.log('********************************************************************');
    console.log('item: ' + item);
    console.log('page._: ' + page._);
    console.log('page.ATTR.blockName: ' + page.ATTR.blockName);    
    console.log('data.batch.page[0].block[1]._: ' + data.batch.page[0].block[1]._ );
    console.log('********************************************************************');*/
    //if(data.batch.page[0].block[1]._ == '2010100011514' && page.ATTR.blockName =='Замена_ответ_В02')
    //  console.log('breakpoint');
    let croppedImage = path.join(__dirname, '../public/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/', /*штрих-код изображения*/
    data.batch.page[0].block[1]._+ '/') + data.batch.page[0].block[3]._ + '_' + path.parse(item).name + '_' + page.ATTR.blockName + '.png';

    await readFile(item + '.' + (item + '.TIF').match(/TIF|TIFF/))
      .then((originalImage)=>{
          sharp(originalImage)
            .extract(      
              {'left': parseInt(page.ATTR.l,10), 
              'top': parseInt(page.ATTR.t,10),
              'width' : /*1071*/parseInt(page.ATTR.r,10) - parseInt(page.ATTR.l,10),
              'height': /*92*/parseInt(page.ATTR.b,10) - parseInt(page.ATTR.t,10)
            })
            .toFile(croppedImage)
              .then(() =>{
                callback();
              })
              .catch(err =>{
                console.log('Error1 in toFile: ' + err.message + '; left: ' + parseInt(page.ATTR.l) + '; top: ' + parseInt(page.ATTR.t,10) + 
                  '; width: ' + (parseInt(page.ATTR.r,10) - parseInt(page.ATTR.l,10)) + '; height: '+ (parseInt(page.ATTR.b,10) - parseInt(page.ATTR.t,10)) + '; original image: ' + item
                    +'; cropped image: ' + croppedImage +'\n');

                /*
                Запускаем резку для данного изображения снова, так как она слетела в первый вариант
                */
                /*sharp(input)
                  .extract(      
                    {
                        'left': parseInt(page.ATTR.l,10), 
                        'top': parseInt(page.ATTR.t,10),
                        'width' : parseInt(page.ATTR.r,10) - parseInt(page.ATTR.l,10),//1071
                        'height': parseInt(page.ATTR.b,10) - parseInt(page.ATTR.t,10) //92
                    })
                    .toFile(
                        path.join(__dirname, '../public/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/',  data.batch.page[0].block[1]._+ '/') + data.batch.page[0].block[3]._ 
                          + '_' + path.parse(item).name + '_' + page.ATTR.blockName + '.png')
                      .then(() =>{
                        callback();
                      })
                      .catch(err =>{                      
                        console.log('Error2 in toFile: ' + JSON.stringify(err.message));
                      });
  */
              });
      }) 
      .catch((err)=>{
        console.log('err in imageCrop[]: '+ err);
      }); 
}} 

//функция для энкодинга 
function readFileSync_encoding(filename,enc){
  let cont = fs.readFileSync(filename);
  return iconvlite.decode(cont,enc);
}


async function GetListOfStudentsAnswers(){
  let listOfStudentsAnswers = [];
  listOfStudentsAnswers.task = new Object();
  for(let blank of listOfBlanks){
    let xml_string = readFileSync_encoding(blank + '.XML', 'UTF-16');//.replace(/\?\?/,'');
    
    //вытаскиваем из файлов необходимые данные
    parser.parseString(xml_string, (err, data) => {
        if(err){
          throw err;
        }            
        for(let i = 0; i < 75; i++){ // число 75 взято от бaлды, лучше будет придумать что-нибудь по-надёжнее 
          let page = data.batch.page[0].block[i];      
          if(page._ && !(page.ATTR.blockName.match(/В\d\d/) === 'null' || page.ATTR.blockName.match(/В\d\d/) === null )){
           
            listOfStudentsAnswers.task = page.ATTR.blockName;
            listOfStudentsAnswers.task.value = page._;
            listOfStudentsAnswers.task.cropped_image = '\\memory\\' + project_name + '\\images\\'+ /*код предмета*/ data.batch.page[0].block[3]._ + '\\' +
            + /*штрих-код изображения*/ data.batch.page[0].block[1]._ + '\\' + data.batch.page[0].block[3]._ + '_' +
                path.parse(item).name + '_' + page.ATTR.blockName + '.png';
            listOfStudentsAnswers.task.original_image = item + '.TIF';
            listOfStudentsAnswers.task.subject_code = data.batch.page[0].block[3]._; 
            listOfStudentsAnswers.task.project_name = project_name;
          }
        }
    });
  }

  return listOfStudentsAnswers;
}

module.exports = inst;
