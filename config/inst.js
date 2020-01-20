var fs = require('fs');
let sharp = require('sharp');
let path = require('path');
let xml2js = require('xml2js');
let iconvlite = require('iconv-lite');
let xmlBuilder = require('xmlbuilder');
let parser = new xml2js.Parser({ attrkey: "ATTR" });
const util = require('util');
const mysql = require("mysql2");
  
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
      paths_to_the_aud = fs.readdirSync(dir), aud_list = [];

    const pool = mysql.createPool({
      host: "localhost",
      user: "admin",
      database: "ver_db",
      password: "Adminspassword"
    });

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
            console.error('err in parseString : ' + err);
          else{
            for(let i = 0; i < 75; i++){ // число 75 взято от бaлды, лучше будет заменить 
              let page = data.batch.page[0].block[i];
              if(page._ && !(page.ATTR.blockName.match(/В\d\d/) === 'null' || page.ATTR.blockName.match(/В\d\d/) === null )){
                //проверка на существование папки предмета (например 1 - русский) с  ответом или её создание
                
                /*
                  вставка данных в бд об обрезанном изображении
                */
                let sql = "insert into answers(`status`, `onhand`, `value`, `cropped_image`, `original_image`, `subject_code`, `project_name`)" 
                  +' values( ' + 0 +','+ 0 +',\"'+ data.batch.page[0].block[i]._ + '\",\"' + 
                  '\\memory\\' + project_name+ '\\images\\'+ data.batch.page[0].block[3]._+ '\\' + data.batch.page[0].block[3]._ + '_' +
                  path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png' 
                  +'\",\"'+ item + '.TIF' + '\",'+ data.batch.page[0].block[3]._ + ',\"' + project_name + '\")';
                
                pool.execute(sql,(err)=>{
                      if(err) 
                        return console.error("Ошибка: " + err.message); 
                });

                pool.execute('insert into complete_projects(project_name,subject_code) values(\"' + project_name + '\",' + data.batch.page[0].block[3]._ +')' ,(err)=>{
                  if(err)  return console.log("Ошибка: " + err.message);
                }); 

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
      /*
      pool.end(function(err) {
        if (err) {
          return console.error(err.message);
        } else {
          console.log('pool is closed');
        }
      });*/
     

    return true;

  } catch (err){
      console.error('Ошибика: ' + err);
    }
  }, 
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