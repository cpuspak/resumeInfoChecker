var express = require('express');

var router = express.Router();

router.get('/', function(req,res){
    res.redirect('/home');
});

router.get('/uploadResume',function(req,res,next){
    res.redirect('/home');
});

router.get('/downloadCSV',function(req,res,next){
    res.redirect('/home');
});

router.get('/downloadPhotos',function(req,res,next){
    res.redirect('/home');
});

router.get('/downloadXLSX',function(req,res,next){
    res.redirect('/home');
});


router.get('/home',function(req,res,next){
    res.render('homePage',{visibility : "display:none;", fontsUsed : "0", noOfTables : "0", noOfImages : "0", noOfPages : "0", noOfLines : "0", noOfCharacters : "0"});
});

module.exports = router;