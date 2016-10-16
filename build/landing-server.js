"use strict";
var fs = require('fs');
var express = require("express");
var bodyParser = require("body-parser");
var errorHandler = require("errorhandler");
var cuid = require('cuid');
var app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
var env = process.env["NODE_ENV"] || 'development';
if (env == 'development') {
    app.use(errorHandler());
    var expressLogging = require('express-logging'), logger = require('logops');
    app.use(expressLogging(logger));
    console.log('Request Logging enabled');
}
app.use(express.static(__dirname + '/../public'));
app.get('/', function (req, resp, done) {
    resp.redirect('/public/landing.html');
});
var trackerPNG = fs.readFileSync('public/static/images/1x1.png');
app.get('/tracker/1x1/:id', function (req, resp, done) {
    fs.appendFile('tracked.txt', req.params.id + ',\n', function (err) {
        resp.writeHead(200, { 'Content-Type': 'image/png' });
        resp.end(trackerPNG);
        done();
    });
});
app.get('/subscribe/confirm/:id', function (req, resp, done) {
    fs.appendFile('confirmed.txt', req.params.id + ',\n', function (err) {
        done();
    });
});
var nodemailer = require('nodemailer');
var config = JSON.parse(fs.readFileSync("config.json", 'utf8'));
var transporter = nodemailer.createTransport(config.subscribe.options);
function htmlEscape(literals) {
    var placeholders = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        placeholders[_i - 1] = arguments[_i];
    }
    var result = "";
    for (var i = 0; i < placeholders.length; i++) {
        result += literals[i];
        result += placeholders[i]
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }
    result += literals[literals.length - 1];
    return result;
}
var lotmpl = require('lodash.template');
var emailTmp = lotmpl(fs.readFileSync("welcome-to-cryptographix.en.html", "utf8"));
function escapeFormField(field) {
    return field
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}
function sendMail(template, info, cb) {
    var auth = config.subscribe.auth;
    var mailOptions = {
        from: config.subscribe.from,
        to: escapeFormField(info.email),
        subject: 'Cryptographix - Welcome',
        html: emailTmp(info),
    };
    transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
            console.log(error);
            cb(error);
        }
        else {
            console.log('Message sent: ' + info.response);
            cb(false);
        }
    });
}
app.post('/api/subscribe', function (req, resp, done) {
    var info = {
        name: escapeFormField(req.body.name),
        email: escapeFormField(req.body.email),
        origin: escapeFormField(req.body.origin),
        lang: escapeFormField(req.body.lang),
        type: escapeFormField(req.body.type),
        id: cuid()
    };
    fs.appendFile('subscribers.txt', JSON.stringify(info) + ',\n', function (err) {
        sendMail("", info, function (err) {
            if (!err) {
                resp.status(200).json({ success: "Email sent" });
            }
            else {
                resp.status(500).json({ message: "Unable to send email:", error: err });
            }
            done();
        });
    });
});
var port = 8400;
app.listen(port, function () {
    console.log("Cryptographix submit server listening on port %d in %s mode", port, app.settings.env);
});
exports.App = app;
//# sourceMappingURL=landing-server.js.map