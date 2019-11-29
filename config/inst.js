var fs = require('fs');
let sharp = require('sharp');
let path = require('path');
let xml2js = require('xml2js');
let iconvlite = require('iconv-lite');
let xmlBuilder = require('xmlbuilder');
let parser = new xml2js.Parser({ attrkey: "ATTR" });

//получение папок проектов для резки изображений
let inst = {
  //возвращает список папок с проектами
  dirTree: function (dir) {
    let project_list = [], list = fs.readdirSync(dir);
    for (let item of list) {
      if (fs.statSync(name = dir + "\\" + item).isDirectory()) {
        project_list.push("\t".repeat(0) + item);
      }
    }
    return project_list;
  },
  //projects/dir/batches/00000000/

  getFiles: function (project_name) {
    try{
    let dir = path.join(__dirname, '../projects/', project_name, '/batches/00000000'),
        paths_to_the_aud = fs.readdirSync(dir), aud_list = [], answers_list = [];

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

  

  for(let item of aud_list){
    //console.log('xml path: '+ item + '.XML');   
    //console.log('outfile: ' + path.join(__dirname, 'projects/images/') + path.parse(item).name + '_' + i + '.png');        
    let xml_string = readFileSync_encoding(item + '.XML', 'UTF-16');//.replace(/\?\?/,'');
    
    //вытаскиваем из файлов необходимые данные
    parser.parseString(xml_string,
      (err, data) => {
        if(!err){    
          for(let i = 0; i < 75; i++){ // число 75 взято от болды, лучше будет заменить 

            if(data.batch.page[0].block[i]._ &&
              !(data.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/) === 'null' || 
              data.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/) === null )){
                //console.log('i1 = ' + data.batch.page[0].block[i]._); //номер задания
                //console.log('i2 = ' + data.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/)); //ответ ученика
                //проверка на существование папки с  ответом
                fs.mkdir(path.join(__dirname, '../memory/', project_name, '/images/', data.batch.page[0].block[3]._,'/'), 
                      { recursive: true}, err => {
                  if(!err) {
                      //режем и сохраняем вырезанные изображения
                      imageCrop(item, data, i, project_name);

                      //создаём элемент для записи в xml 
                      /*answers_list.push(
                        {
                          'value' : data.batch.page[0].block[i]._,
                          //Путь должен быть относительным
                          'ref' : path.join( '/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/') + data.batch.page[0].block[3]._ + '_' +
                          path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png',
                          '_image_source': item + '.TIF', 
                          '_subject_code': data.batch.page[0].block[3]._,
                          'check' : false,
                          '_project': project_name
                        }
                      );  */

                      let aswer =  {
                        'value' : data.batch.page[0].block[i]._,
                        //Путь должен быть относительным
                        'ref' : path.join( '/memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/') + data.batch.page[0].block[3]._ + '_' +
                        path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png',
                        '_image_source': item + '.TIF', 
                        '_subject_code': data.batch.page[0].block[3]._,
                        'check' : false,
                        '_project': project_name
                      };
                      //console.log('answers list : '  +  JSON.stringify(JSON.stringify(aswer)));
                      fs.exists(path.join(__dirname, '../memory/', project_name) + '/index.json', (exists)=>{
                        if(exists){
                          fs.appendFileSync(path.join(__dirname, '../memory/', project_name) + '/index.json', JSON.stringify(aswer));
                        } else {
                          fs.writeFile(path.join(__dirname, '../memory/', project_name) + '/index.json', JSON.stringify(aswer), (err) => {
                            if(err)
                              console.error('line 89: ' + err);
                          });
                        }

                      })
                                       
                    }
                  });              
              }
            }  
           
          }
        else{
          console.error(err);
        }
      });
    }    
    return project_name; //вернуть ссылку на список ответов для проекта   
  } catch (err){
    throw err;  
  }
},
  
  search: function (nameKey, myArray){
    for (var i=0; i < myArray.length; i++) {
      if (myArray[i].pr_name === nameKey) {
          return true;
      }
    }
    return false;
  }
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
      fs.writeFile(path.join(__dirname, '../memory/', project) + '/index.xml', batches, (err)=>{
        if(err)
          console.error('line 127: ' + err);        
      });         
      console.log('batches: ' + batches);
}}

//резка изображений
function imageCrop(item, data, i, project_name){
  //console.log('with toFile:' + i);
  sharp(fs.readFileSync(item + '.' + (item + '.TIF').match(/TIF|TIFF/)))
    .extract(
      {'left': parseInt(data.batch.page[0].block[i].ATTR.l), 
      'top': parseInt(data.batch.page[0].block[i].ATTR.t),
      /*width*/'width' : 1071,//parseInt(data.batch.page[0].block[i].ATTR.r - data.batch.page[0].block[i].ATTR.l),
      /*height*/'height': 92,//parseInt(data.batch.page[0].block[i].ATTR.b - data.batch.page[0].block[i].ATTR.t)
    })
    .toFile(path.join(__dirname, '../memory/', project_name, '/images/', data.batch.page[0].block[3]._, '/') + data.batch.page[0].block[3]._ 
    + '_' + path.parse(item).name + '_' + data.batch.page[0].block[i].ATTR.blockName + '.png', (err)=>{
        if(err){
          imageCrop( item, data, i, project_name);
          //console.log('with toFile:' + err);
        }
    });

};

//функция для энкодинга 
function readFileSync_encoding(filename,enc){
  let cont = fs.readFileSync(filename);
  return iconvlite.decode(cont,enc);
}

module.exports = inst;