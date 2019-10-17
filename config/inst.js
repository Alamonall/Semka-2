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
              console.log('dirname: ' + path.join(dir, item, file));
              console.log('dir: ' + path.join(__dirname, 'projects'));
              aud_list.push(path.join(dir, item, path.parse(file).name));
          }
        }    
      }
    }
    return this.cutting(aud_list);
  },
  cutting: function(list){
    let i = 0,arr = [], done;
    for(let item of list){
      console.log('xml path: '+ item + '.XML');   
      //console.log('outfile: ' + path.join(__dirname, 'projects/images/') + path.parse(item).name + '_' + i + '.png');        
      let xml_string = readFileSync_encoding(item + '.XML', 'UTF-16');//.replace(/\?\?/,'');
      parser.parseString(xml_string,
      (err, res)=>{
        done = 'DONE: ' + res.batch.page[0].block[0]._;//лишнее
        let batches = xmlBuilder.create('projects');
        if(!err){
          for(let i = 0; i < 75; i++) // число 75 взято от болды
            if(res.batch.page[0].block[i]._ &&
               !(res.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/) === 'null' || res.batch.page[0].block[i].ATTR.blockName.match(/В\d\d/) === null )){
                done = 'Done: ' + res.batch.page[0].block[i].ATTR.blockName;
                //резка изображения
                /*console.log(i + "l: " + res.batch.page[0].block[i].ATTR.l);
                console.log(i + "r: " + res.batch.page[0].block[i].ATTR.r);
                console.log(i + "t: " + res.batch.page[0].block[i].ATTR.t);
                console.log(i + "b: " + res.batch.page[0].block[i].ATTR.b);*/
                console.log('Input Image: ' +(item + '.TIF').match(/TIF|TIFF/));
                console.log('width: ' + parseInt(res.batch.page[0].block[i].ATTR.r - res.batch.page[0].block[i].ATTR.l));
                console.log('height: ' + parseInt(res.batch.page[0].block[i].ATTR.b - res.batch.page[0].block[i].ATTR.t));
                let input_file = fs.readFile(item +'.' + (item + '.TIF').match(/TIF|TIFF/),(err,data)=>{
                  if(err)
                    throw(err);
                  else 
                    return data;
                });
                sharp(fs.readFileSync(item + '.' + (item + '.TIF').match(/TIF|TIFF/)))
                  .extract(
                    {'left': parseInt(res.batch.page[0].block[i].ATTR.l), 
                    'top': parseInt(res.batch.page[0].block[i].ATTR.t),
                     /*width*/'width' : 1071,//parseInt(res.batch.page[0].block[i].ATTR.r - res.batch.page[0].block[i].ATTR.l),
                    /*height*/'height': 92,//parseInt(res.batch.page[0].block[i].ATTR.b - res.batch.page[0].block[i].ATTR.t)
                   })
                  .toFile(path.join(__dirname,'..','projects/images/') + path.parse(item).name + '_' + i + '.png', (err)=>
                  {
                    if(err)
                      console.log(err);
                  });

                batches.ele('answer', {
                  'id' : uuidv1(),
                  'value' : res.batch.page[0].block[i]._,
                  'ref' : item + '_' + i + '.png'
                })
            }
        }
        else{
          console.log(err);
        }
      });
    }
    return done;   
  }
  
}

function readFileSync_encoding(filename,enc){
  let cont = fs.readFileSync(filename);
  return iconvlite.decode(cont,enc);
}

module.exports = inst;