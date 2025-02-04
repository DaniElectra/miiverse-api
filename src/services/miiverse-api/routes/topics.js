var express = require('express');
var router = express.Router();
const database = require('../../../database');
const comPostGen = require('../../../util/CommunityPostGen');
const processHeaders = require('../../../util/util');
const xmlbuilder = require("xmlbuilder");
const moment = require("moment");

/* GET post titles. */
router.get('/', async function (req, res) {
    let communities = await database.getCommunities(10);
    if(communities === null)
        return res.sendStatus(404);
    let response = await comPostGen.topics(communities);
    res.contentType("application/xml");
        res.send(response);
});

module.exports = router;
