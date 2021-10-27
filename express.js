"use strict";

// This server runs via Express and also serves index.html which calls wss://
// The server.js file is simpler and shorter for production, however, if an
// express server needs to be run alongside the websocket server, this example
// can be handy as it allows running both.

const fs = require("fs");
var express = require("express");
var app = express();
var cors = require("cors");
const http = require("http");
const https = require("https");
const { Server } = require("ws");

const Snapshot = require("./Snapshot");
const PubSub = require("./PubSub");
const Feed = require("./Feed");

// TEST MODE
const isTestMode = process.argv[2] && process.argv[2].toLowerCase() == "test";

// CONFIG
const config = {
  allowed: ["brecorder.com", "newskit.com", "localhost"],
  host: process.env.NODE_ENV == "production" ? "wss.newskit.com" : "localhost",
  port: process.env.PORT || 3001,
  redis: {
    host: process.env.NODE_ENV == "production" ? "scribe.cqmetj.0001.euw1.cache.amazonaws.com" : "localhost",
    prefix: "psx:",
  },
  feed: {
    host: isTestMode ? "localhost" : "212.47.234.13",
  },
};

// HTTPS
const certificate = fs.readFileSync(`${__dirname}/${config.host}.crt`, "utf8");
const privateKey = fs.readFileSync(`${__dirname}/${config.host}.key`, "utf8");
const credentials = { key: privateKey, cert: certificate };
const httpsServer = https.createServer(credentials, app);
httpsServer.listen(config.port, () => {
  console.log(`Listening on ${config.port}`);
  console.log(`Open https://${config.host}:${config.port} and view console log`);
  console.log();
});

/**
 * Snapshot: Configure & Init
 */
const snapshot = new Snapshot({
  host: config.redis.host,
  keyPrefix: config.redis.prefix,
});

/**
 * PubSub: Configure & Init
 */
const publisher = new PubSub({
  host: config.redis.host,
  keyPrefix: config.redis.prefix,
});

/**
 * CORS
 */
var corsOptions = {
  origin: function (origin, callback) {
    var re = new RegExp("(" + config.allowed.join("|") + ")$"); // (foo.com|bar.com)$
    var originIsWhitelisted = re.test(origin);
    callback(originIsWhitelisted ? null : "Security Error (" + origin + ")", originIsWhitelisted);
  },
};

/**
 * Middleware: Others
 * http://stackoverflow.com/a/5867710/50475
 */
app.use(function (req, res, next) {
  res.removeHeader("x-powered-by");
  res.set("Connection", "close");
  next();
});

/**
 * Middleware: CORS
 */
// app.use(function (req, res, next) {
//   return cors(corsOptions)(req, res, next);
// });

/**
 * Root Path
 *
 * Test:
 * curl https://localhost:3001/ -sSLk -H "Origin: http://www.brecorder.com"
 */
app.get("/", function (req, res) {
  // res.send();
  res.sendFile("index.html", { root: __dirname });
});

/**
 * curl http://localhost:3000/snapshot/all -v -H "Origin: http://www.brecorder.com"
 * curl http://localhost:3000/snapshot/meta -v -H "Origin: http://www.brecorder.com"
 * curl http://localhost:3000/snapshot/efert,psx100 -v -H "Origin: http://www.brecorder.com"
 */
app.get("/snapshot/:type", async function (req, res) {
  "use strict";

  var type = req.params.type.toUpperCase();

  if (type == "META") {
    return res.send("@TODO META");
  }

  if (type == "ALL") {
    return res.send("@TODO ALL");
  }

  const result = await snapshot.get(type);

  return res.send(result);
});

/**
 * https://github.com/websockets/ws/blob/master/doc/ws.md
 *
 * WSS
 *
 * Stream ticker data. Note that this only contains data changed for current tick.
 * This means that on the client side, it's probably best to get a snapshot/all first
 * then run this with differential data. However, this poses a challenge that if a
 * single tick is missed, then the snapshot will fall out of sync with current rates.
 *
 * For that reason, it might be advisable to routinely get snapshots every minute or so
 * and bring everything in sync.
 *
 * Further, the snapshot and stream should not have a lag. It is advisable to first
 * connect the stream and ignore the data. Then get a snapshot and once obtained,
 * start parsing the stream data. If this isn't done, it's possible a snapshot is
 * obtained then after a 5 second lag the stream starts by which time 5 ticks will
 * be missed and stocks in those ticks will be out-of-sync on the client.
 *
 * @@TODO Don't rely on snapshot and just get the client to send a message to the WSS
 *        which can then respond via on('message', ...) and return all ticker
 *        data so client can sync periodically.
 *
 * Testing Code:
 *
 * websocket = new WebSocket("wss://localhost:3001")
 * websocket.onopen = function(evt) { console.log('open') }
 * websocket.onmessage = e => { console.log('RES:' + e.data) }
 * websocket.onclose = function(evt) { console.log('close') }
 * websocket.onerror = function(error) { console.error('error', error.message);  }
 */
const wss = new Server({ server: httpsServer });
wss.on("connection", async (ws, req) => {
  const path = req.url;
  const ip = req.connection.remoteAddress;

  console.log("Client connected", ip);

  // Each websocket client gets their own subscriber instance
  const subscriber = new PubSub({
    host: config.redis.host,
    keyPrefix: config.redis.prefix,
  });

  ws.on("close", () => {
    console.log("Client disconnected", ip);
    subscriber.unsubscribe();
  });

  // listen for messages from our pubsub subscriber regarding a tick
  subscriber.onMessage((symbol, data) => ws.send(data));

  // client send a message to subscribe to topic
  ws.on("message", async (requested) => {
    const topics = requested.toUpperCase().split(/,\s*/);

    // Then subscribe to the stream
    topics.forEach((symbol) => subscriber.subscribe(symbol));

    // Send the most recent snapshot right away. We send one at a time, the same format
    // as for a subscribed symbol. We could optimize this by sending in bulk but we would
    // need to make sure the client can handle this.
    const snaps = await snapshot.get(requested);
    for (let snap in snaps) {
      ws.send(JSON.stringify(snaps[snap]));
    }
  });
});

// PUBLISHER: Listens to the feed and publishes it
// This is not express server related code, rather this just
// opens up listeners on PSX ports for the feed and publishes
// updates to the symbol's channel. This belongs somewhere else,
// maybe even run as a separate deamon so publishing chugs along
// independent of subscription.
Feed.listen(config.feed.host, 9020, (tick) => {
  publisher.publish(tick.symbol, JSON.stringify(tick));
  snapshot.set([tick]);
});

// Feed.listen(config.feed.host, "exchange", (ticks) => {
//   for (let tick in ticks) {
//     publisher.publish(tick, JSON.stringify(ticks[tick]));
//   }
//   snapshot.set(ticks);
// });
