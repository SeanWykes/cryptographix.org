import * as fs from 'fs';
//import * as http from "http";
//import * as url from "url";
import * as express from "express";
import * as bodyParser from "body-parser";
import errorHandler = require("errorhandler");

var cuid = require( 'cuid' );

var app = express();

app.use( bodyParser.urlencoded( { extended: true } ) );
app.use( bodyParser.json() );

var env = process.env["NODE_ENV"] || 'development';
if ( env == 'development' ) {
  app.use( errorHandler() );

  let expressLogging = require('express-logging'),
      logger = require('logops');

  app.use(expressLogging(logger));
  console.log( 'Request Logging enabled' );
}

// Mount public as '/'
app.use( express.static(__dirname + '/../public') );
console.log( __dirname + '/../public' );

app.get( '/',  (_req, resp, _done) => {
  resp.redirect( '/landing.html' );
} );

let trackerPNG = fs.readFileSync('public/static/images/1x1.png' );
app.get( '/tracker/1x1/:id', (req, resp, done) => {
  fs.appendFile('tracked.txt', req.params.id+',\n', function (_err) {
    resp.writeHead(200, {'Content-Type': 'image/png' } );
    resp.end( trackerPNG );
    done();
  } );
} );

app.get( '/subscribe/confirm/:id', (req, _resp, done) => {
  fs.appendFile('confirmed.txt', req.params.id+',\n', function (_err) {
    //if ( !err )

//    resp.redirect('https://d335luupugsy2.cloudfront.net/cms%2Ffiles%2F3775%2F1471523880E-sample-Wykes_Criptografia_Essencial_1ed.pdf');

    done();
  });

} );

var nodemailer = require('nodemailer');
var config = JSON.parse( fs.readFileSync("config.json", 'utf8') );
// create reusable transporter object using the default SMTP transport
var transporter = nodemailer.createTransport( config.subscribe.options );

// a sample tag function
function htmlEscape(literals, ...placeholders) {
    let result = "";

    // interleave the literals with the placeholders
    for (let i = 0; i < placeholders.length; i++) {
        result += literals[i];
        result += placeholders[i]
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    // add the last literal
    result += literals[literals.length - 1];
    return result;
}

var lotmpl = require( 'lodash.template' );

var emailTmp = lotmpl( fs.readFileSync( "welcome-to-cryptographix.en.html", "utf8" ) );

function escapeFormField( field: string ): string {
  return field
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
}

function sendMail( template, info, cb ) {
  var auth = config.subscribe.auth;

  // setup e-mail data with unicode symbols
  var mailOptions = {
      from: config.subscribe.from, // sender address
      to: escapeFormField( info.email ), // list of receivers
      subject: 'Cryptographix - Welcome', // Subject line
     // text: 'Hello world' + JSON.stringify( info ), // plaintext body
      html: emailTmp( info ),
  };

  // send mail with defined transport object
  transporter.sendMail(mailOptions, function( error, info ) {

    if ( error ) {
      console.log(error);

      cb( error );
    } else {
      console.log('Message sent: ' + info.response);

      cb( false );
    }
  });
}

// mount /api
app.post( '/api/subscribe', (req, resp, done) => {
  let info  = {
    name: escapeFormField( req.body.name ),
    email: escapeFormField( req.body.email ),
    origin: escapeFormField( req.body.origin ),
    lang: escapeFormField( req.body.lang ),
    type: escapeFormField( req.body.type ),
    id: cuid()
  };

  if ( req.get('Authorization') == 'Bearer ' + 'ZTBUqwQTokTXRhOJcNQN6UCy4ZJ/rwqyueLU5lELqMY=' ) {
    fs.appendFile('subscribers.txt', JSON.stringify( info )+',\n', function (_err) {
      sendMail( "", info, (err) => {
        if ( !err ) {
          resp.status(200).json({success: "Email sent"});
        } else {
          resp.status(500).json({message: "Unable to send email:", error: err });
        }

        done();
      } )
    });
  }
  else {
    resp.status(401).json({message: "Unable to authorize"});
    done();
  }

} );

//
let port = 8100;
app.listen( port, ()=>{
  console.log("Cryptographix submit server listening on port %d in %s mode", port, app.settings.env );
} );

export var App = app;
