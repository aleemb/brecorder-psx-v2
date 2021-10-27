/*global require, module */
var Redis = require("ioredis");
require("events").EventEmitter.defaultMaxListeners = 100;

module.exports = function PubSub(options) {
  var redis = null;
  var pub = null;

  // can be overridden via options
  // https://github.com/luin/ioredis/blob/master/API.md
  var defaults = {
    keyPrefix: "psx:",
    host: "127.0.0.1",
  };

  options = Object.assign({}, defaults, options);
  var sub = Redis.createClient(options);

  /**
   * Client subscribes to a symbol and their callback is fired
   * if any data is published for the symbol.
   */
  this.subscribe = async function (symbol) {
    // https://github.com/luin/ioredis/blob/master/API.md
    sub.subscribe(symbol, (error, count) => {
      if (error) return console.log("subscribe.error", error);
      console.log("Subscribed to " + symbol + ". Now subscribed to " + count + " channel(s).");
    });
  };

  /**
   * Client listens for channel messages via a callback
   */
  this.onMessage = function(callback) {
    // triggered when publish() is called
    sub.on("message", function (channel, message) {
      // channel is symbol, message is tick
      callback(channel, message);
    });
  }

  /**
   * Client can unsubscribe, freeing up some memory. This unsubscribes to
   * all channels, the client is subscribed on. Since we are built to operate
   * in a websocket context, this is desired. Once a page closes, the websocket
   * goes away, as do all the subscriptions for that websocket.
   */
  this.unsubscribe = async function () {
    // lazy init redis inside because AWS API gateway deployment (via claudia deploy)
    // tries to connect on each endpoint creation
    sub = sub || Redis.createClient(options);

    // https://github.com/luin/ioredis/blob/master/API.md
    sub.unsubscribe((error, count) => {
      console.log("Unsubscribed. Count stands at " + count + " channel(s).");
    });
  };

  /**
   * Publish some data against a symbol. Clients subscribed to the symbol will
   * receive the data.
   */
  this.publish = async function (symbol, data) {
    // lazy init redis inside because AWS API gateway deployment (via claudia deploy)
    // tries to connect on each endpoint creation
    pub = pub || Redis.createClient(options);

    pub.publish(symbol, data);
  };
};
