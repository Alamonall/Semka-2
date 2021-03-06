const path = require('path');
const mysql = require('mysql2');
const ExcelJS = require('exceljs');
const fs = require('graceful-fs')
const util = require('util');
const mkdir = util.promisify(fs.mkdir);

module.exports.export = async function(project_name){
    try {
        const pool = mysql.createPool({
            host: 'localhost',
            user: 'root',
            database: 'ver_db',
            password: 'admin',
        }).promise();

        let workbook = new ExcelJS.Workbook();
        let worksheet = workbook.addWorksheet(project_name);
        
        await mkdir(path.join(__dirname, '../public/memory/exports/'), {
            recursive: true
        });

        let query = "SELECT a.task as `Task`, '' as `Package`, case when a.status = 1 then 'Не грубая ошибка' when a.status = 2 then 'Грубая ошибка' end as `Status`, a.project_name as `Project`, '' as `Verificator`, a.username as `Controller` FROM ver_db.answers as a where a.status in (1,2) and a.project_name = ? order by 1;";

        let link = pool.execute(query, [project_name])
        .then(rows => { 
            worksheet.columns = [
                { header: 'Пакет', key: 'Package' },
                { header: 'Задание', key: 'Task' },
                { header: 'Тип ошибки', key: 'Status' },
                { header: 'Проект' , key: 'Project' },
                { header: 'Верификатор', key: 'Verificator' },
                { header: 'Контроллер', key: 'Controller' }
            ];
    
            rows[0].forEach(row => {
                // Add row using key mapping to columns
                worksheet.addRow(
                    {
                        Package: row.Package,
                        Task: row.Task,
                        Status: row.Status,
                        Project: row.Project,
                        Verificator: row.Verificator,
                        Controller: row.Controller
                    } 
                );
            }); 

            return workbook
                .xlsx
                .writeFile(path.join(__dirname, '../public/memory/exports/') + project_name + '.xlsx')
                .then(() => {   
                    return path.join(__dirname, '../public/memory/exports/') + project_name + '.xlsx';
                })
                .catch((err) => {
                    console.log("err", err);
                    return err;
                });
        })
        .catch(err => {
            console.log("err", err);
            return err;
        });
        return link;
    } catch (err){
        console.log("err", err);
        return err;
    }
   
}