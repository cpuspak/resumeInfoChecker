var express = require('express');
//var connection = require('./database');
var bodyParser = require('body-parser');
var fileUpload = require('express-fileupload');
var csv = require('csv-parser');
var fs = require('fs');
var session = require('express-session');
var pdfParse = require('pdf-parse');
var connection = require('./database');
var docxConverter = require('docx-pdf');
var zipFolder = require('zip-folder');
var createCsvWriter = require('csv-writer').createObjectCsvWriter;
var XLSX = require('xlsx');

///////////////////////////  for debugging python sub process call
/*
(function() {
    var childProcess = require("child_process");
    var oldSpawn = childProcess.spawn;
    function mySpawn() {
        console.log('spawn called');
        console.log(arguments);
        var result = oldSpawn.apply(this, arguments);
        return result;
    }
    childProcess.spawn = mySpawn;
})();
*/
//////////////////////////

var app = express();

var currentCount = 0;

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({secret : "superSecret"}));
app.use(fileUpload());

var {PythonShell} = require( 'python-shell');



//session is working fine for different devices ... if time permits later I'll implement the session for every new tab
app.post("/uploadResume", function(req, res){
    var query = "CREATE TABLE IF NOT EXISTS UPLOADEDDOCUMENTS (SLNO INT AUTO_INCREMENT PRIMARY KEY, FILENAME VARCHAR(30) UNIQUE NOT NULL, FILELOCATION VARCHAR(500) UNIQUE NOT NULL, FONTS VARCHAR(200) NOT NULL, IMAGES INT NOT NULL, TABLES INT, FILETYPE VARCHAR(6), LINESNO INT, CHARACTERS BIGINT, PAGES INT)";
    connection.query(query);
    if(req.files){
        var fileName = req.files.resumeFile.name;
        var file = req.files.resumeFile;
        //just making the pdf part for now
        if(fileName.slice(fileName.length - 4,fileName.length) == '.pdf'){


            req.session.fileName = currentCount.toString() + fileName;
            req.session.fileLocation = './uploaded/pdf/' + req.session.fileName;
            file.mv(req.session.fileLocation);
            currentCount += 1;
            req.session.imageLocation = './generated/images/' + req.session.fileName;
            fs.mkdirSync(req.session.imageLocation);
            fs.mkdirSync(req.session.imageLocation + '/temp');
            
            //** setting the options for python script */
            var options = {
                mode : 'text',
                encoding : 'utf8',
                pythonOptions : ['-u'],
                scriptPath : 'D:/projects/brainChange/resumeInfoChecker',
                pythonPath : 'C:/Python3.7.2/python',
                args : [req.session.fileLocation.slice(2,req.session.fileLocation.length), req.session.imageLocation.slice(2,req.session.imageLocation.length) + '/temp',req.session.fileName]
            };
            
            PythonShell.run('getInfo.py', options, function (err, results) {
                if (err) 
                    throw err;
                // Results is an array consisting of messages collected during execution
                //console.log('results: %j', results);
                //console.log(results);
                req.session.info = results[0].split(" ");  //req.session.info[0] = noOfTables, req.session.info[1] = allFonts, req.session.info[2] = noOfImages
                req.session.info[1] = req.session.info[1].split(",");
                //var pdfFile = fs.readFileSync(req.session.fileLocation);

                pdfParse(req.session.fileLocation).then(function(data){
                    //console.log(data);
                    req.session.info.push(data.numpages);    
                    //console.log(data);
                    //console.log(data.text.trim('\n').split('\n'));
                    var data_ = data.text.trim('\n').split('\n');
                    //var filtered = [];
                    req.session.info.push([]);
                    req.session.info[req.session.info.length - 1] = data_.filter(function(value, index, arr){ return value.trim(' ').length > 1;});
                    //console.log(filtered)
                    //console.log(req.session.fileLocation);
                    req.session.info.push(0)
                    //console.log(req.session.info);
                    req.session.info[req.session.info.length - 2].forEach(function(ele){
                        ele.split(' ').forEach(function(ele1){
                            req.session.info[req.session.info.length - 1] += ele1.length;
                        });
                        
                    });

                    //req.session.info[0] = noOfTables, req.session.info[1] = allFonts, req.session.info[2] = noOfImages, req.session.info[3] = no of pages, req.session.info[4] = lines, req.session.info[5] = no of characters

                    //"CREATE TABLE IF NOT EXISTS UPLOADEDDOCUMENTS (SLNO INT AUTO_INCREMENT PRIMARY KEY, FILENAME VARCHAR(30) UNIQUE NOT NULL, FILELOCATION VARCHAR(500) UNIQUE NOT NULL, FONTS VARCHAR(200) NOT NULL, IMAGES INT NOT NULL, TABLES INT, FILETYPE VARCHAR(6), LINES INT, CHARACTERS BIGINT, PAGES INT)";
                    //console.log(req.session.info)
                    var query = "INSERT INTO UPLOADEDDOCUMENTS (FILENAME, FILELOCATION , FONTS , IMAGES , TABLES, FILETYPE, LINESNO, CHARACTERS, PAGES) VALUES ('"+req.session.fileName+"', "+"'"+req.session.fileLocation+"' , "+"'"+req.session.info[1]+"', "+"'"+req.session.info[2]+"' , "+"'"+req.session.info[0] + "' , "+"'pdf'" + ", '"+req.session.info[4].length + "' ,"+"'" + req.session.info[5] + "' ," + "'" + req.session.info[3] + "')";
                    connection.query(query);
                    res.render('homePage',{visibility : "display:block;", fontsUsed : req.session.info[1], noOfTables : req.session.info[0], noOfImages : req.session.info[2], noOfPages : req.session.info[3], noOfLines : req.session.info[4].length, noOfCharacters : req.session.info[5]});
                }).catch(function(error){
                        console.log(error);
                });
            });

            
            
        //for .docx files    
        } else if(fileName.slice(fileName.length - 5,fileName.length) == '.docx') {
            //we have seen that python can't handle files with space in their names
            req.session.fileName = currentCount.toString() + fileName.trim(' ').split(' ').join('')
            //req.session.fileName = currentCount.toString() + fileName;
            req.session.fileLocation = './uploaded/docx/' + req.session.fileName;
            file.mv(req.session.fileLocation);
            currentCount += 1;
            req.session.imageLocation = './generated/images/' + req.session.fileName;
            
            req.session.fileLocationPdf = './uploaded/tempPdf/' + req.session.fileName.slice(0,req.session.fileName.length - 5) + '.pdf'

            //console.log([req.session.fileLocation.slice(2,req.session.fileLocation.length), req.session.imageLocation.slice(2,req.session.imageLocation.length) + '/temp', req.session.fileName])
            
            fs.mkdirSync(req.session.imageLocation);
            fs.mkdirSync(req.session.imageLocation + '/temp');
            
            //** setting the options for python script */
            /*scriptPath : give the path of getInfo.py in your file system */
            /*pythonPath : give the path of python.exe in your file system*/
            var options = {
                mode : 'text',
                encoding : 'utf8',
                pythonOptions : ['-u'],
                scriptPath : 'D:/projects/brainChange/resumeInfoChecker',
                pythonPath : 'C:/Python3.7.2/python',
                args : [req.session.fileLocation.slice(2,req.session.fileLocation.length), req.session.imageLocation.slice(2,req.session.imageLocation.length) + '/temp', req.session.fileName]
            };
              
            PythonShell.run('getInfo.py', options, function (err, results) {
                if (err) 
                    throw err;
                // Results is an array consisting of messages collected during execution
                //console.log('results: %j', results);
                //console.log(results);
                req.session.info = results[0].split(" ");  //req.session.info[0] = noOfTables, req.session.info[1] = allFonts, req.session.info[2] = noOfImages
                req.session.info[1] = req.session.info[1].split(",");
                //var pdfFile = fs.readFileSync(req.session.fileLocationPdf);
            //* testing **/
                /*
                pdfParse(pdfFile).then(function(data){
                    req.session.info.push(data.numpages);    
                    console.log(data);
                    console.log(data.text.trim('\n').split('\n').length);
                    console.log(req.session.fileLocation);
                });
                */
                req.session.convertedFilePath = './uploaded/tempPdf/' + req.session.fileName.slice(0,req.session.fileName.length - 5) + 'ver2.pdf';
                //fs.mkdirSync(req.session.convertedFilePath)
                docxConverter(req.session.fileLocation,req.session.convertedFilePath, (err, result) => {
                    if (err) console.log(err);
                    //else console.log(result); // writes to file for us
                    else{
                        //console.log(result.data);
                        pdfParse(req.session.convertedFilePath).then(function(data){
                            req.session.info.push(data.numpages);    
                            //console.log(data);
                            //console.log(data.text.trim('\n').split('\n'));
                            var data_ = data.text.trim('\n').split('\n');
                            //var filtered = [];
                            req.session.info.push([]);
                            req.session.info[req.session.info.length - 1] = data_.filter(function(value, index, arr){ return value.trim(' ').length > 1;});
                            //console.log(filtered)
                            //console.log(req.session.fileLocation);
                            req.session.info.push(0)
                            //console.log(req.session.info);
                            req.session.info[req.session.info.length - 2].forEach(function(ele){
                                ele.split(' ').forEach(function(ele1){
                                    req.session.info[req.session.info.length - 1] += ele1.length;
                                });
                                
                            });
        
                            //req.session.info[0] = noOfTables, req.session.info[1] = allFonts, req.session.info[2] = noOfImages, req.session.info[3] = no of pages, req.session.info[4] = lines, req.session.info[5] = no of characters
        
                            //"CREATE TABLE IF NOT EXISTS UPLOADEDDOCUMENTS (SLNO INT AUTO_INCREMENT PRIMARY KEY, FILENAME VARCHAR(30) UNIQUE NOT NULL, FILELOCATION VARCHAR(500) UNIQUE NOT NULL, FONTS VARCHAR(200) NOT NULL, IMAGES INT NOT NULL, TABLES INT, FILETYPE VARCHAR(6), LINES INT, CHARACTERS BIGINT, PAGES INT)";
                            //console.log(req.session.info)
                            var query = "INSERT INTO UPLOADEDDOCUMENTS (FILENAME, FILELOCATION , FONTS , IMAGES , TABLES, FILETYPE, LINESNO, CHARACTERS, PAGES) VALUES ('"+req.session.fileName+"', "+"'"+req.session.fileLocation+"' , "+"'"+req.session.info[1]+"', "+"'"+req.session.info[2]+"' , "+"'"+req.session.info[0] + "' , "+"'docx'" + ", '"+req.session.info[4].length + "' ,"+"'" + req.session.info[5] + "' ," + "'" + req.session.info[3] + "')";
                            connection.query(query);
                            res.render('homePage',{visibility : "display:block;", fontsUsed : req.session.info[1], noOfTables : req.session.info[0], noOfImages : req.session.info[2], noOfPages : req.session.info[3], noOfLines : req.session.info[4].length, noOfCharacters : req.session.info[5]});
                        }).catch(function(error){
                                console.log(error);
                        });
                    }
                });

//* testing **/        
            });
        }

        else {
            res.render('homePage',{visibility : "display:none;", fontsUsed : "0", noOfTables : "0", noOfImages : "0", noOfPages : "0", noOfLines : "0", noOfCharacters : "0"});    
        }
    }    
    else {
        res.render('homePage',{visibility : "display:none;", fontsUsed : "0", noOfTables : "0", noOfImages : "0", noOfPages : "0", noOfLines : "0", noOfCharacters : "0"});
    }
});

app.post("/downloadResumeCSV", function(req, res){

    //req.session.info[0] = noOfTables, req.session.info[1] = allFonts, req.session.info[2] = noOfImages, req.session.info[3] = noOfPages, req.session.info[4] = lines, req.session.info[5] = noOfCharacters


    var csvWriter = createCsvWriter({
        path: 'generated/csv/' + req.session.fileName + '.csv',
        header: [
            {id: 'noOfTables', title: 'NOOFTABLES'},
            {id: 'allFonts', title: 'ALLFONTS'},
            {id: 'noOfImages', title: 'NOOFIMAGES'},
            {id: 'noOfPages', title: 'NOOFPAGES'},
            {id: 'noOfLines', title: 'NOOFLINES'},
            {id: 'noOfCharacters', title: 'NOOFCHARACTERS'},
        ]
    });
     
    var records = [
        {
            noOfTables : req.session.info[0],
            allFonts : req.session.info[1],
            noOfImages : req.session.info[2],
            noOfPages : req.session.info[3],
            noOfLines : req.session.info[4].length,
            noOfCharacters : req.session.info[5]
        }
    ];
     
    csvWriter.writeRecords(records)       // returns a promise
        .then(() => {
            res.download('./generated/csv/' + req.session.fileName + '.csv');
        });
    
});

app.post("/downloadPhotos", function(req, res){
    zipFolder('./generated/images/' + req.session.fileName, './generated/images/' + req.session.fileName + '.zip', function(err) {
        if(err) {
            console.log(err);
        } else {
            //console.log('success');
            res.download('./generated/images/'+req.session.fileName + '.zip');
        }

    });
});
////  XLSX download format pending
app.post("/downloadXLSX", function(req, res){
    var wb = XLSX.utils.book_new();

    var ws_name = "info";

    /* make worksheet */

    var ws_data = [
    [ "noOfTables", "allFonts", "noOfImages", "noOfPages", "noOfLines", "noOfCharacters"],
    [  req.session.info[0] ,  req.session.info[1].join(',') ,  req.session.info[2] ,  req.session.info[3] ,  req.session.info[4].length , req.session.info[5] ]
    ];
    var ws = XLSX.utils.aoa_to_sheet(ws_data);

    /* Add the worksheet to the workbook */
    XLSX.utils.book_append_sheet(wb, ws, ws_name);
    XLSX.writeFile(wb, './generated/xlsx/' + req.session.fileName + '.xlsx');
    res.download('./generated/xlsx/' + req.session.fileName + '.xlsx');

});


module.exports = app;
