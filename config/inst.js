let fs = require('graceful-fs')
let path = require('path');

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
  }
}

module.exports = inst;