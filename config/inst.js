var fs = require('fs');
let sharp = require('sharp');
let path = require('path');
let xml2js = require('xml2js');
let iconvlite = require('iconv-lite');
let xmlBuilder = require('xmlbuilder');
let parser = new xml2js.Parser({ attrkey: "ATTR" });
const uuidv1 = require('uuid/v1');

//получение папок проектов для резки изображений
let inst = {
  dirTree: function (dir) {
    var project_list = [];
    let list = fs.readdirSync(dir);
    for (let item of list) {
      if (fs.statSync(name = dir + "\\" + item).isDirectory()) {
        project_list.push("\t".repeat(0) + item);
      }
    }
    return project_list;
  },
  //projects/dir/batches/00000000/

  getFiles: function (dir, shift) {
    if (!shift) shift = 0;
    let path_to_the_aud = fs.readdirSync(dir);
    //console.log('path: ' + path_to_the_aud);

    let aud_list = [];
    for (let item of path_to_the_aud) {
      console.log('path: ' + item);
      let files = fs.readdirSync(dir + '\\' + item);
      //console.log('name', files);
      for(let file of files)
      {
        if(file.match(/AB/)){
            //console.log('name: ' + file);
            if(path.extname(file).match(/XML/)){
              console.log('exte: ' + path.extname(file));  
              console.log('filename: ' + path.parse(file).name);  
              console.log('dirname: ' + item);
              console.log('dir: ' + path.join(__dirname, 'projects'));
              aud_list.push(path.join(dir, item, path.parse(file).name));
          }
        }    
      }
    }
    return this.cutting(aud_list);
  },
  cutting: function(list){
   
    let answer_count = 0,arr = [], done;
    
    batches = xmlBuilder.create('projects');
    try{
      for(let item of list){
      console.log('xml path: '+ item + '.XML');   
      //console.log('outfile: ' + path.join(__dirname, 'projects/images/') + path.parse(item).name + '_' + i + '.png');        
      let xml_string = readFileSync_encoding(item + '.XML', 'UTF-16');//.replace(/\?\?/,'');
      parser.parseString(xml_string,
        (err, res)=>{
          done = 'DONE: ' + answer_count;//лишнее
          if(!err){
            for(let i = 0; i < 75; i++) // число 75 взято от болды
              if(res.batch.page[0].block[i]._ &&
                !(res.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/) === 'null' 
                || res.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/) === null )){
                  //проверка на существование папки с  ответом
                  if(!fs.existsSync(path.join(__dirname, '..', 'projects/images/', res.batch.page[0].block[3]._, '/'))){
                    fs.mkdirSync(path.join(__dirname, '..', 'projects/images/', res.batch.page[0].block[3]._,'/'));
                    //if(!fs.existsSync(path.join(__dirname, '..', 'projects/iamges/', res.batch.page[0].block[3]._, res.batch.page[0].block[i]._)))
                      //fs.mkdirSync(path.join(__dirname, '..', 'projects/images/', res.batch.page[0].block[3]._, res.batch.page[0].block[i]._));
                  }
                  //режем и сохраняем вырезанные изображения
                  imageCrop(item,res,i);
                  
                  //создаём элемент в xml 
                  batches.ele('answer', {
                    'id' : answer_count++,
                    'value' : res.batch.page[0].block[i]._,
                    'ref' : path.join('..','projects/images/', res.batch.page[0].block[3]._, '/') + res.batch.page[0].block[3]._ + '_' +
                    path.parse(item).name + '_' + res.batch.page[0].block[i].ATTR.blockName + '.png',
                    'subject': res.batch.page[0].block[3]._
                  });
              }
          }
          else{
            console.error(err);
          }
        });
      }
      batches.end({ pretty: true, allowEmpty: true});
      indexing(batches);
      fs.writeFile('xml-out.xml',batches,(err,data)=>{
        if(err)
          console.log(err);
        else
          console.log('created!');
      })
    }catch(err){
      console.error(err);
    }
    return done;   
  }
  
}


function indexing(answers){


}

//резка изображений
function imageCrop(item,res,i){
  sharp(fs.readFileSync(item + '.' + (item + '.TIF').match(/TIF|TIFF/)))
    .extract(
      {'left': parseInt(res.batch.page[0].block[i].ATTR.l), 
      'top': parseInt(res.batch.page[0].block[i].ATTR.t),
      /*width*/'width' : 1071,//parseInt(res.batch.page[0].block[i].ATTR.r - res.batch.page[0].block[i].ATTR.l),
      /*height*/'height': 92,//parseInt(res.batch.page[0].block[i].ATTR.b - res.batch.page[0].block[i].ATTR.t)
    })
    .toFile(path.join(__dirname,'..','projects/images/', res.batch.page[0].block[3]._, '/') + res.batch.page[0].block[3]._ + '_' +
      path.parse(item).name + '_' + res.batch.page[0].block[i].ATTR.blockName + '.png', (err)=>{
        if(err){
          imageCrop(item,res,i);
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