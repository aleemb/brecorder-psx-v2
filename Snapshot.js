/*global require, module */
var Redis = require("ioredis");
require("events").EventEmitter.defaultMaxListeners = 100;

module.exports = function Snapshot(options) {
  var redis = null;

  // can be overridden via options
  // https://github.com/luin/ioredis/blob/master/API.md
  var defaults = {
    keyPrefix: "psx:",
    host: "127.0.0.1",
  };

  options = Object.assign({}, defaults, options);

  /**
   * Persists any blob against a symbol, example
   *
   * ticker.set([
   *   '{symbol: "EFERT", "open": "50.10", "close": "60.10", "low": "48.50", "high": "48.00", "price": "55.00"},
   *   ...
   * ]);
   */
  this.set = function (ticks) {
    // lazy init redis inside because AWS API gateway deployment (via claudia deploy)
    // tries to connect on each endpoint creation
    redis = redis || Redis.createClient(options);

    // {EFERT:{...}, LUCK:{...}} to [{...}, {...}]
    var array = Object.keys(ticks).map(function (key) {
      return ticks[key];
    });

    const data = array.reduce((acc, data) => {
      acc.push(data.symbol.toUpperCase(), JSON.stringify(data));
      return acc;
    }, []);

    return redis.hmset("ticks", data);
  };

  /**
   * Accepts a string of comma-separated symbols:
   *
   * results = await ticker.get("EFERT,PSX100,LUCK")
   * {
   *   "EFERT": "{symbol: "EFERT", "open": "50.10", "close": "60.10", "low": "48.50", "high": "48.00", "price": "55.00"}",
   *    ...
   * }
   */
  this.get = async function (symbols) {
    // lazy init redis inside because AWS API gateway deployment (via claudia deploy)
    // tries to connect on each endpoint creation
    redis = redis || Redis.createClient(options);

    // "A,B, C" to ["A", "B", "C"]
    symbols = symbols.toUpperCase().split(/,\s*/);

    let results = await redis.hmget("ticks", symbols);

    // remove empty results (for requested symbols that don't exist)
    results = results.filter((r) => r != null);

    const object = results.reduce((acc, data) => {
      data = JSON.parse(data);
      acc[data.symbol] = data;
      return acc;
    }, {});

    return object;
  };
};
