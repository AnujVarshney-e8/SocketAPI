const express = require('express');        // call express
const app = express();                 // define our app using express
const bodyParser = require('body-parser');    //call body-parser

const http = require('http');                 //call http
const sock = require('sockjs');               //call sockjs
const host = 'http://dummy.restapiexample.com/api/v1/';             //set host of external API
const websocketport = 1337;                   //set websocket port
const env_port = 8080;                        //set api port


var sockets = {};

/*
* Create websockets server and attach listeners
*/

var socketServer = sock.createServer();

socketServer.on('connection', function (conn) {
    sockets[conn.id] = conn;

});


var httpServer = http.createServer().listen(websocketport);

socketServer.installHandlers(httpServer, { prefix: '/websockets' });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var port = process.env.PORT || env_port;


var router = express.Router();


router.use(function (req, res, next) {
    next();
});



router.get('/', function (req, res) {
    console.log('API is working!');
});


router.route('/fetchEmployees')
    .get(function (req, res) {
        // RELAY DATA TO EXTERNAL API
        // =============================================================================
        performRequest('/employees', 'GET', null, function (data) {
            console.log(data);
            var dataString = JSON.stringify(data);
            for (var id in sockets) {
                sockets[id].write(dataString); //transmit data to websocket clients
            }
        });

    });


app.use('/api', router);

app.listen(port);
console.log('Now listening to port ' + port);

//CALL EXTERNAL API
// =============================================================================
function performRequest(endpoint, method, data, success) {

    var dataString = JSON.stringify(data);
    var headers = {};

    if (method == 'POST') {
        headers = {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(dataString, 'utf8')
        };
    }

    var options = {
        host: host,
        path: endpoint,
        method: method,
        headers: headers
    };
    var req = http.request(options, function (res) {
        debugger;
        res.setEncoding('utf8');
        var responseString = '';

        res.on('data', function (data) {
            console.log(data);
            responseString += data;
        });

        res.on('end', function () {
            var responseObject = JSON.parse(responseString);
            success(responseObject);
        });
    });

    req.on('error', function (e) {
        console.log('error on submitting data');
    });

    req.write(dataString);
    req.end();
}