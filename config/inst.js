var fs = require('fs');
let sharp = require('sharp');
let path = require('path');
let xml2js = require('xml2js');
let iconvlite = require('iconv-lite');
let xmlBuilder = require('xmlbuilder');
let parser = new xml2js.Parser({ attrkey: "ATTR" });
const util = require('util');

const stat = util.promisify(fs.stat);
const readFile = util.promisify(fs.readFile);
const mkdir = util.promisify(fs.mkdir);
const readdir = util.promisify(fs.readdir);

//получение папок проектов для резки изображений
let inst = {
  //возвращает список папок с проектами
  dirTree: function (dir) {
    //console.log('dirthree: ' + dir);
    let project_list = []; 
    let list = fs.readdirSync(dir);       
    //console.log('list: '+ list.length); 
    for (let item of list) {
      if (fs.statSync(dir + "\\" + item).isDirectory()) {
        //console.log('project_list' + item);
        project_list.push("\t".repeat(0) + item);
      }
    } 
    
    return project_list;
},
  //projects/dir/batches/00000000/

  getFiles: function (project_name) {
   
    let dir = path.join(__dirname, '../projects/', project_name, '/batches/00000000'),
      paths_to_the_aud = fs.readdirSync(dir), aud_list = [], answers_list = [],
      project = {"project" : project_name, "subjects": []};
    let answers = {};
    //console.log('paths_to_the_aud:' + paths_to_the_aud);
    
    //создание папки с проектом, если её нет
    fs.mkdir(path.join(__dirname, '../memory/', project_name), { recursive: true}, (err)=>{
      if(err)
      console.log('err: ' + err);
    });

    for (let item of paths_to_the_aud) {
      //выборка необходимых файлов с данными ддя резки и ответов
      let files = fs.readdirSync(dir + '\\' + item);
      //console.log('name', files);
      for(let file of files)
      {
        if(file.match(/AB/)){
            //console.log('name: ' + file);
            if(path.extname(file).match(/XML/)){
              /*console.log('exte: ' + path.extname(file));  
              console.log('filename: ' + path.parse(file).name);  
              console.log('dir: ' + dir);
              console.log('dir_path: ' + path.join(dir, item, path.parse(file).name));*/
              aud_list.push(path.join(dir, item, path.parse(file).name));
          }
        }    
      }
    }

    try{
      fs.writeFileSync(path.join(__dirname, '../memory/', project_name) + '/list_of_answers.json');
    
      for(let item of aud_list){
        //console.log('xml path: '+ item + '.XML');   
        //console.log('outfile: ' + path.join(__dirname, 'projects/images/') + path.parse(item).name + '_' + i + '.png');        
        let xml_string = readFileSync_encoding(item + '.XML', 'UTF-16');//.replace(/\?\?/,'');
        
        //вытаскиваем из файлов необходимые данные
        parser.parseString(xml_string, (err,data) => {
          if(err)
            console.log('err in parseString : ' + err);
          else{
            for(let i = 0; i < 75; i++){ // число 75 взято от бaлды, лучше будет заменить 
              let page = data.batch.page[0].block[i];
              if(page._ && !(page.ATTR.blockName.match(/В\d\d/) === 'null' || page.ATTR.blockName.match(/В\d\d/) === null )){
                //проверка на существование папки предмета (например 1 - русский) с  ответом или её создание
                
                /*{
                  "sbj1":  //код предмета
                   {"sources" : [
                     {"ref": "ref1", //ссылка на обрезанное изображение
                      "status" : "0",
                    "id": 0}, //0 - не обработано, 1 - негрубая ошибка, 2 - грубая ошибка
                   ]},
                   "sbj2":  //код предмета
                   {"sources" : [
                     {"ref": "ref1", //ссылка на обрезанное изображение
                      "status" : "0",
                      "id": 0}, //0 - не обработано, 1 - негрубая ошибка, 2 - грубая ошибка
                   ]}                   
                }              */

                answers_list.push({
                  //новые элементы
                  "id" : 0,
                  "status": 0, //статусы проверки изображений: 0 - не обработано, 1 - негрубая ошибка, 2 - грубая ошибка
                  'check' : false, //взято ли изображение на проверку
                  //
                  'value' : data.batch.page[0].block[i]._, //значение
                  //Путь должен быть относительным
                  '_cropped_image' : path.join( '/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/') + data.batch.page[0].block[3]._ + '_' +
                  path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png', //обрезанное изображение
                  '_original_image_': item + '.TIF', //бланк, откуда было вырезано изображение
                  '_subject_code': data.batch.page[0].block[3]._, //код предмета
                  '_project': project_name // имя проекта
                }) 
                
 
                //mySearch(data.batch.page[0].block[3]._, project.subjects) ? 
                //  null : project.subjects.push(data.batch.page[0].block[3]._);
                //Проверяем, есть ли в project уже текущий код предмета
                if(!mySearch(data.batch.page[0].block[3]._, project.subjects)){
                  project.subjects.push(data.batch.page[0].block[3]._);
                  answers[data.batch.page[0].block[3]._];
                }

                let val = data.batch.page[0].block[i]._;
                let cropped = path.join( '/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/') + data.batch.page[0].block[3]._ + '_' +
                path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png';
                if(answers[data.batch.page[0].block[3]._]){
                  answers[data.batch.page[0].block[3]._][val].push(
                      {
                        "ref": cropped, 
                        "status" : 0,
                        "id" : 0
                      }
                  );
                } else{
                    //if(answers[data.batch.page[0].block[3]._][val]){
                      answers[data.batch.page[0].block[3]._] = { val:
                        [
                          {
                            "ref": cropped, 
                            "status" : 0,
                            "id" : 0
                          }
                        ]
                      }
                  //}
                }

                let varMkDir = mkdir(path.join(__dirname, '../memory/', project_name, 
                '/images/', data.batch.page[0].block[3]._,'/'), {recursive: true });
                varMkDir.then(                   
                 imageCrop(item, data, i, project_name)
                );
              }
            } 
          }       
        })
      }
    console.log('writing the answers to json ');
    fs.writeFileSync(path.join(__dirname, '../memory/', project_name) + '/list_of_answers.json', JSON.stringify(answers_list));
    fs.writeFileSync(path.join(__dirname, '../memory/', project_name) + '/answers.json', JSON.stringify(answers));
    return project;
  } catch (err){
      console.log(err);
    }
  }, 


  //функция, которая сортирует и разбирает изображения с ответами участников на поля, 
  //чтобы вернуть их клиенту для отображения
  indexingImages: function(list_of_answers, subject){
    let json = JSON.parse(list_of_answers); 
    let list = []; 
    let answers = {
      "project": json._project,
      "subject": subject, 
      "answers": [
        {"answer" : "",
          "sources": []}
      ]
    };
    for(i in json){

    }
    return list;
  }
}
 
function mySearch(nameKey, myarray){
  for (let i=0; i < myarray.length; i++) {
    if (myarray[i] === nameKey) {
        return true;
    }
  }
  return false;
}

//резка изображений
function imageCrop(item, data, i, project_name){
  //console.log('with toFile:' + i);
  readFile(item + '.' + (item + '.TIF').match(/TIF|TIFF/))
  .then((inf)=>
      sharp(inf)
        .extract(
          {'left': parseInt(data.batch.page[0].block[i].ATTR.l), 'top': parseInt(data.batch.page[0].block[i].ATTR.t),
          /*width*/'width' : 1071,//parseInt(data.batch.page[0].block[i].ATTR.r - data.batch.page[0].block[i].ATTR.l),
          /*height*/'height': 92,//parseInt(data.batch.page[0].block[i].ATTR.b - data.batch.page[0].block[i].ATTR.t)
        })
        .toFile(path.join(__dirname, '../memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/') + data.batch.page[0].block[3]._ 
        + '_' + path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png')
  )
  .catch((err)=>{
    console.log('err in imageCrop[' + i + ']: '+ err);
    imageCrop(item, data, i, project_name);
  });
} 

//функция для энкодинга 
function readFileSync_encoding(filename,enc){
  let cont = fs.readFileSync(filename);
  return iconvlite.decode(cont,enc);
}

module.exports = inst;