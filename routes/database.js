var mysql = require('mysql');

var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'Itisgreat@1', // put your mysql root password inside the quotes
    database: 'resumeInfo'
});


connection.connect(function(error){
    if(error){
        console.log(error);
        console.log("Error connecting to db...");
    }
    else{
        console.log("Connected to db...");
    }
});

module.exports = connection;
