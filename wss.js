// Simple websocket server
// https://github.com/websockets/ws#simple-server

const fs = require("fs");
const https = require("https");
const WebSocket = require("ws");

const HOST = process.env.NODE_ENV == "production" ? "wss.newskit.com" : "localhost";
const PORT = process.env.PORT || 3001;

const certificate = fs.readFileSync(`${__dirname}/${HOST}.crt`, "utf8");
const privateKey = fs.readFileSync(`${__dirname}/${HOST}.key`, "utf8");
const credentials = { key: privateKey, cert: certificate };

const server = https.createServer(credentials);
const wss = new WebSocket.Server({ server });

wss.on("connection", (ws) => {
  console.log("Client connected");
  ws.on("close", () => console.log("Client disconnected"));
});

setInterval(() => {
  wss.clients.forEach((client) => {
    client.send(new Date().toISOString());
  });
}, 1000);

server.listen(PORT);

console.log(`

Server listening on ${PORT}

1. Open https://${HOST}:${PORT}
2. Ignore the loading indicator, it will stay
3. In JS Console, experiment with WebSockets

websocket = new WebSocket("wss://${HOST}:${PORT}")
websocket.onopen = function(evt) { console.log('open') }
websocket.onmessage = e => { console.log('RES:' + e.data) }
`);
