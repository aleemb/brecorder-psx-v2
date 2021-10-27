/**
 *
 * Deprecated: We don't need this for now.
 *
 * Use Snapshot.js instead. That simply takes the JSON blob and stores it or fetches it
 * as a dumb storage engine. This means clients can store any JSON blob against a symbol
 * and store any data in that blob. Typically we'll just store the most recent tick data.
 */

/*global require, module */
var Redis = require("ioredis");
require("events").EventEmitter.defaultMaxListeners = 100;

module.exports = function Ticker(options) {
  var redis = null;

  // can be overridden via options
  // https://github.com/luin/ioredis/blob/master/API.md
  var defaults = {
    keyPrefix: "psx:",
    host: "127.0.0.1",
  };

  options = Object.assign({}, defaults, options);

  /**
   * Accepts an array of objects with the required keys as follows:
   *
   * ticker.set([
   *   {symbol: "EFERT", "open": "50.10", "close": "60.10", "low": "48.50", "high": "48.00", "price": "55.00"},
   *   {symbol: "LUCK", "open": "400.00", "close": "400.00", "low": "390.00", "high": "410.00", "price": "405.00"},
   * ])
   *
   * Any extraneous keys in the object are ignored. The data is stored as:
   *
   * > hmget "psx:ticks" "EFERT" "LUCK"
   *   EFERT;55.00;50.10;60.10;48.50;48.00
   *   LUCK;405.00;400.00;400.00;390.00;410.00
   *
   * Each row is formatted as <symbol>;<price>;<open>;<close>;<low>;<high>
   *
   * The "close" is the most recent trading day's close. If market are still open,
   * then it's yesterday close.
   *
   * "close" is used to compute the price change. Let's say a stock
   * closed at 100 yesterday, then after hours went to 110 and gapped
   * open at 110. If the stock trades flat all day, ticker watchers will
   * think there's zero change in price since open. They may be mislead
   * that the stock hasn't moved since yesterday. Hence we need the last
   * closing price to truly convey that the stock rose 10%, igoring the
   * open which gapped up.
   *
   * High/Low values are either current if trading is open, or based on
   * the last trading day.
   */
  this.set = function (ticks) {
    // lazy init redis inside because AWS API gateway deployment (via claudia deploy)
    // tries to connect on each endpoint creation
    redis = redis || Redis.createClient(options);

    const now = Math.round(new Date().getTime() / 1000); // epoch

    const data = ticks.reduce((acc, v) => {
      acc.push(v.symbol, `${v.symbol};${now};${v.price};${v.open};${v.close};${v.low};${v.high}`);
      return acc;
    }, []);

    return redis.hmset("ticks", data);
  };

  /**
   * Accepts a string of comma-separated ticks:
   *
   * results = await ticker.get("EFERT,PSX100,LUCK")
   * {
   *   "EFERT": "EFERT;1588421753;55.00;50.10;60.10;48.50;48.00",
   *   "LUCK": "LUCK;1588421753;405.00;400.00;400.00;390.00;410.00",
   *   "<sym>": "<sym>;<epoch>;<price>;<open>;<close>;<low>;<high>",
   * }
   */
  this.get = async function (ticks) {
    // lazy init redis inside because AWS API gateway deployment (via claudia deploy)
    // tries to connect on each endpoint creation
    redis = redis || Redis.createClient(options);

    // "A,B, C" to ["A", "B", "C"]
    ticks = ticks.toUpperCase().split(/,\s*/);

    let results = await redis.hmget("ticks", ticks);

    // remove empty results (for tickers that don't exist)
    results = results.filter((r) => r != null);

    const object = results.reduce((acc, t) => {
      const key = t.substr(0, t.indexOf(";"));
      acc[key] = t;
      return acc;
    }, {});

    return object;
  };
};
