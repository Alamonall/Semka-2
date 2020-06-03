var express = require('express');
var router = express.Router();


router.get('/admin', function(req, res, next) {
    res.render('admin', { title: 'Есть? А Если найду?' });
  });

router.get('/verifycontrol', function(req, res, next) {
    res.render('verifycontrol', { title: 'Есть? А Если найду?' });
  });

  
module.exports = router;