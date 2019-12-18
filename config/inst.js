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
    let project_list = []; 
    let list = fs.readdirSync(dir);        
    for (let item of list) {
      if (fs.statSync(dir + "\\" + item).isDirectory()) {
        project_list.push("\t".repeat(0) + item);
      }
    } 
    return project_list;
},
  //projects/dir/batches/00000000/

  getFiles: function (project_name) {
   
    let dir = path.join(__dirname, '../projects/', project_name, '/batches/00000000');
    let paths_to_the_aud = fs.readdirSync(dir), aud_list = [], answers_list = [];
    console.log('paths_to_the_aud:' + paths_to_the_aud);
    
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
          for(let i = 0; i < 75; i++){ // число 75 взято от бaлды, лучше будет заменить 
            let page = data.batch.page[0].block[i];
            if(page._ && !(page.ATTR.blockName.match(/В\d\d/) === 'null' || page.ATTR.blockName.match(/В\d\d/) === null )){
              //проверка на существование папки предмета (например 1 - русский) с  ответом или её создание
              //project-subject-value
              //       -subject-value
              //               -value
              answers_list.push(
                '_subject_code': data.batch.page[0].block[3]._ [
                  {
                  'value' : data.batch.page[0].block[i]._ [
                    {
                      '_cropped_image' : path.join( '/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/') + data.batch.page[0].block[3]._ + '_' +
                      path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png',
                      '_original_image_': item + '.TIF', 
                      'check' : false,
                    }]
                  }]
              )
              /*answers_list.push({
                'value' : data.batch.page[0].block[i]._,
                //Путь должен быть относительным
                '_cropped_image' : path.join( '/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/') + data.batch.page[0].block[3]._ + '_' +
                path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png',
                '_original_image_': item + '.TIF', 
                '_subject_code': data.batch.page[0].block[3]._,
                'check' : false,
                '_project': project_name
              })*/
              
              const varMkDir = mkdir(path.join(__dirname, '../memory/', project_name, '/images/', data.batch.page[0].block[3]._,'/'), {recursive: true });
                varMkDir.then( imageCrop(item, data, i, project_name))
            }
          }        
        })
      }
    fs.writeFileSync(path.join(__dirname, '../memory/', project_name) + '/list_of_answers.json',JSON.stringify(answers_list));
    return project_name;
  } catch (err){
      throw err;
    }
  },
  
  search: function (nameKey, myarray){
    for (var i=0; i < myarray.length; i++) {
      if (myarray[i].pr_name === nameKey) {
          return true;
      }
    }
    return false;
  },

  indexingNumbers: function(file){

  }
}

function spectre(file, answers){
  if(answers.length > 0)
    fs.writeFile(file, answers, (err)=>{
      if(err) throw err;
    });
}

function writingsOfTheWall(file, answer){
  fs.readFile(file, (err, data)=>{
    if(!err){
      console.log('writingsOfTheWall0');
      if(data == ''){
        console.log('writingsOfTheWall1: ' + JSON.stringify(answer) + '; ' + answer);
        fs.writeFile(file, JSON.stringify(answer), (err) => {
          if(err) throw err;
        });
      }
      else{
        console.log('writingsOfTheWall2: ' + JSON.stringify(answer) + '; ' + answer);
        let uncodedData = JSON.stringify(data);
        uncodedData.push(answer);
        fs.writeFile(file, answer, (err) => {
          if(err) throw err;
        });
      }
    } 
    else {
      console.log('writingsOfTheWall3 - ' + JSON.stringify(answer) + '; error: ' + err);
      fs.writeFile(file, JSON.stringify(answer), (err) => {
        if(err) 
          throw err;
      });
    }
  });
}

function creatingXmlWithFiles(list, project){
    //создание xml-ки
    let batches = xmlBuilder.create('projects', {'project_name': project});
  if(list.length > 0){
    console.log("answers length = " + list.length);
    //сортировка
    list.sort(function(a, b){
    if (a.value < b.value) //сортируем строки по возрастанию
      return -1
    if (a.value > b.value)
      return 1
    return 0 // Никакой сортировки
  });//,()=>{
    //создание структуры xml  
    console.log('creating xml');
      for(let i = 0; i < list.length; i++){
        batches.ele('answer',{
          'id' : list[i].id,
          'value' : list[i].value,
          'ref' : list[i].ref,
          '_image_source': list[i]._image_source,
          '_subject_code': list[i]._subject_code,
          'check' : list[i].check,
          '_project': list[i]._project
          }
        )
      }
      batches.end({ pretty: true, allowEmpty: true});
      
      //запись ссылок на "обрезки" в xml      
      fs.writeFile(path.join(__dirname, '../memory/', project) + '/list_of_answers.json', batches, (err)=>{
        if(err)
          console.error('line 127: ' + err);        
      });         
      console.log('batches: ' + batches);
}}

//резка изображений
function imageCrop(item, data, i, project_name){
  console.log('with toFile:' + i);
  try{
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
          //.then(console.log)
          //.catch(imageCrop(item, data, i, project_name))
    )
    .catch((err)=>{
      console.log('err in imageCrop[' + i + ']: '+ err);
      imageCrop(item, data, i, project_name)
    })
}catch(er){
  throw er;
}};

//функция для энкодинга 
function readFileSync_encoding(filename,enc){
  let cont = fs.readFileSync(filename);
  return iconvlite.decode(cont,enc);
}

module.exports = inst;