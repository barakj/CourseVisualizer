var express = require('express');
var router = express.Router();
var path = require("path")

/* GET home page. */
router.get('/:id', function(req, res, next) {
    //res.render('index', { title: 'Express' });
    res.json(200, {content: req.params.id + " - foooooooooooo"});
});

module.exports = router;
