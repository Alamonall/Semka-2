var fs = require('fs');
let sharp = require('sharp');
let path = require('path');
let xml2js = require('xml2js');
let iconvlite = require('iconv-lite');
let xmlBuilder = require('xmlbuilder');
let parser = new xml2js.Parser({ attrkey: "ATTR" });

//получение папок проектов для резки изображений
let inst = {
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
    let dir = path.join(__dirname, '../projects/', project_name, '/batches/00000000'),
      paths_to_the_aud = fs.readdirSync(dir), aud_list = [], answers_count = 0,answers_list = [], done;
    for (let item of paths_to_the_aud) {
      //console.log('path: ' + item);
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
    //создание xml-ки
    let batches = xmlBuilder.create('projects', {'project_name': project_name});
    try{
      for(let item of aud_list){
      //console.log('xml path: '+ item + '.XML');   
      //console.log('outfile: ' + path.join(__dirname, 'projects/images/') + path.parse(item).name + '_' + i + '.png');        
      let xml_string = readFileSync_encoding(item + '.XML', 'UTF-16');//.replace(/\?\?/,'');
      parser.parseString(xml_string,
        (err, res)=>{
          done = 'DONE: ' + answers_count; //лишнее
          if(!err){
            for(let i = 0; i < 75; i++) // число 75 взято от болды
              if(res.batch.page[0].block[i]._ &&
                !(res.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/) === 'null' 
                || res.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/) === null )){
                  //проверка на существование папки с  ответом
                  //console.log('Cheking dir: ' + path.join(__dirname, '../memory/', project_name, '/images/', res.batch.page[0].block[3]._, '/'));
                  /*if(!fs.exists(path.join('../memory/', project_name, '/images/', res.batch.page[0].block[3]._, '/'),err=>{
                    if(err) console.error(err);
                  })){*/
                    fs.mkdir(path.join(__dirname, '../memory/', project_name, '/images/', res.batch.page[0].block[3]._,'/'), {recursive: true},err=>{
                      if(err) console.error(err);
                    });
                  //}
                  //режем и сохраняем вырезанные изображения
                  imageCrop( item, res, i, project_name);
                  
                  //создаём элемент в xml 
                  answers_list.push(
                    {
                      'id' : answers_count++,
                      'value' : res.batch.page[0].block[i]._,
                      //Путь должен быть относительным
                      'ref' : path.join( '/memory/',project_name, '/images/', res.batch.page[0].block[3]._, '/') + res.batch.page[0].block[3]._ + '_' +
                      path.parse(item).name + '_' + res.batch.page[0].block[i].ATTR.blockName + '.png',
                      '_image_source': item + '.TIF',
                      '_subject_code': res.batch.page[0].block[3]._,
                      'check' : false,
                      '_project': project_name
                    }
                  );                  
              }
          }
          else{
            console.error(err);
          }
        });
      }      
      //сортировка
      answers_list.sort(function(a, b){
        if (a.value < b.value) //сортируем строки по возрастанию
          return -1
        if (a.value > b.value)
          return 1
        return 0 // Никакой сортировки
      })

      //создание структуры xml  
      for(let i = 0; i < answers_list.length; i++){
        batches.ele('answer',{
          'id' : answers_list[i].id,
          'value' : answers_list[i].value,
          'ref' : answers_list[i].ref,
          '_image_source': answers_list[i]._image_source,
          '_subject_code': answers_list[i]._subject_code,
          'check' : answers_list[i].check,
          '_project': answers_list[i]._project})          
      }
      batches.end({ pretty: true, allowEmpty: true});
      
      fs.writeFile(path.join(__dirname, '../memory/', project_name) + '/index.xml', batches, (err,data)=>{
        if(err)
          console.log(err);
        else
          console.log('created!');
      });

    } catch(err){
        console.error(err);
    }
    return true; //вернуть ссылку на список ответов для проекта   
  }
}

//резка изображений
function imageCrop(item, res, i, project_name){
  sharp(fs.readFileSync(item + '.' + (item + '.TIF').match(/TIF|TIFF/)))
    .extract(
      {'left': parseInt(res.batch.page[0].block[i].ATTR.l), 
      'top': parseInt(res.batch.page[0].block[i].ATTR.t),
      /*width*/'width' : 1071,//parseInt(res.batch.page[0].block[i].ATTR.r - res.batch.page[0].block[i].ATTR.l),
      /*height*/'height': 92,//parseInt(res.batch.page[0].block[i].ATTR.b - res.batch.page[0].block[i].ATTR.t)
    })
    .toFile(path.join(__dirname, '../memory/', project_name, '/images/', res.batch.page[0].block[3]._, '/') + res.batch.page[0].block[3]._ 
    + '_' + path.parse(item).name + '_' + res.batch.page[0].block[i].ATTR.blockName + '.png', (err)=>{
        if(err){
          imageCrop(item,res,i,project_name);
          //console.log('with toFile:' + err);
        }
    });
}

//функция для энкодинга 
function readFileSync_encoding(filename,enc){
  let cont = fs.readFileSync(filename);
  return iconvlite.decode(cont,enc);
}

module.exports = inst;