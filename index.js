
var splunkAddress = process.env["SPLUNK_ADDRESS"];
var splunkToken = process.env["SPLUNK_TOKEN"];
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;

var express = require('express');

var app = express(),
    http = require('http'),
    server = http.createServer(app);

const WebSocket = require('ws');
const serverWss = new WebSocket.Server({
    noServer: true
});

const url = require('url');
var bodyParser = require('body-parser');
var srv = null;

server.on('upgrade', (request, socket, head) => {
    const pathname = url.parse(request.url).pathname;

    if (pathname === '/server') {
        console.log("Upgrading Server Connection");
        serverWss.handleUpgrade(request, socket, head, (ws) => {
            serverWss.emit('connection', ws);
        });
    } else {
        socket.destroy();
    }
});

app.use(bodyParser());

function heartbeat() {
    this.isAlive = true;
}

function processMessage(call, type){
    const https = require('https')

    const data = JSON.stringify({
        event: {
            data: call,
            type: type,
            source: "<SITE NAME>"
        }

    })

    const options = {
        hostname: splunkAddresss,
        port: 8088,
        path: '/services/collector/event',
        method: 'POST',
        headers: {
            'Authorization': 'Splunk ' + splunkToken;
        }
    }
    const req = https.request(options, res => {
     res.on('data', d => {
        process.stdout.write(d)
        })
    })

    req.on('error', error => {
        console.error(error)
    })

    req.write(data)
    req.end()
    console.log("posted " + type)
}

serverWss.on('connection', function connection(ws, req) {
    ws.isAlive = true;
    ws.on('pong', heartbeat);
    console.log((new Date()) + ' WebSocket Connection accepted.');
    ws.on('message', function incoming(message) {
        try {
            var data = JSON.parse(message);
        } catch (err) {
            console.log("JSON Parsing Error: " + err);
        }
        if (data.type == 'calls_active') {
            for (var i = 0; i < data.calls.length; i++) {
                dataX = data.calls[i];
                unit = {
                  emergency: dataX.emergency,
                  position: 0,
                  signal_system: 'P25',
                  source: dataX.srcId,
                  tag: '',
                  time: dataX.startTime,

                }
                processMessage(unit, 'unit')
                processMessage(dataX, 'call')
            }
        }
    });
    ws.on('close', function(reasonCode, description) {
        srv = null;
    });

});
server.listen(3010);
module.exports = server;
