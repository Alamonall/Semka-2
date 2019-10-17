var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/admin', function(req, res, next) {
    res.render('admin', { title: 'Есть? А Если найду?' });
  });

/* GET home page. */
router.get('/settings', function(req, res, next) {
    res.render('settings', { title: 'Есть? А Если найду?' });
  });
 

/* GET home page. */
router.get('/verifycontrol', function(req, res, next) {
    res.render('verifycontrol', { title: 'Есть? А Если найду?' });
  });

  
  module.exports = router;