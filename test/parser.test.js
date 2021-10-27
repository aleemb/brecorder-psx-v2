const assert = require("assert");
const Parser = require("../Parser");

describe("Parse Companies Data", () => {
  it("should parse single tick data", () => {
    const line = "FEED|FNEL;ODL;OPN; ;499;5.56;9.18;380;0.00;0;;7.35;=;0.00;0.00;0.00;0.00;0;0;;|*";
    // prettier-ignore
    const expected = [{ symbol: "FNEL", market: "ODL", state: "OPN", flag: " ", bidv: "499", bidp: "5.56", askp: "9.18", askv: "380", price: "0.00", quantity: "0", time: "", close: "7.35", direction: "=", avg: "0.00", high: "0.00", low: "0.00", change: "0.00", volume: "0", trades: "0", open: "" }];
    assert.deepEqual(Parser.companies(line), expected);
  });

  it("should parse single tick data with lots of missing fields", () => {
    const line = "FEED|FNEL;ODL;OPN; ;;;9.18;380;0.00;0;;7.35;=;0.00;0.00;0.00;0.00;0;0;;|*";
    // prettier-ignore
    const expected = [{ symbol: "FNEL", market: "ODL", state: "OPN", flag: " ", bidv: "", bidp: "", askp: "9.18", askv: "380", price: "0.00", quantity: "0", time: "", close: "7.35", direction: "=", avg: "0.00", high: "0.00", low: "0.00", change: "0.00", volume: "0", trades: "0", open: "" }];
    assert.deepEqual(Parser.companies(line), expected);
  });

  it("should parse multiple ticks", () => {
    const line =
      "FEED|FNEL;ODL;OPN; ;499;5.56;9.18;380;0.00;0;;7.35;=;0.00;0.00;0.00;0.00;0;0;;|*FEED|FNEL;ODL;OPN; ;499;5.56;9.18;380;0.00;0;;7.35;=;0.00;0.00;0.00;0.00;0;0;;|*";
    // prettier-ignore
    const expected = [
      { symbol: "FNEL", market: "ODL", state: "OPN", flag: " ", bidv: "499", bidp: "5.56", askp: "9.18", askv: "380", price: "0.00", quantity: "0", time: "", close: "7.35", direction: "=", avg: "0.00", high: "0.00", low: "0.00", change: "0.00", volume: "0", trades: "0", open: "" },
      { symbol: "FNEL", market: "ODL", state: "OPN", flag: " ", bidv: "499", bidp: "5.56", askp: "9.18", askv: "380", price: "0.00", quantity: "0", time: "", close: "7.35", direction: "=", avg: "0.00", high: "0.00", low: "0.00", change: "0.00", volume: "0", trades: "0", open: "" },
    ];
    assert.deepEqual(Parser.companies(line), expected);
  });
});

describe("Parse Exchange Data", () => {
  it("should parse exchange data", () => {
    const line =
      "EXG-STAT|198;99;19;316;KSE100;33156.90;110812978;6893418036.43;33156.90;32553.39;603.51;$ALLSHR;23371.31;140204628;7692212329.73;23371.31;22977.71;393.60;$KSE30;14574.58;72258848;5333873712.23;14593.24;14281.23;293.35;$KMI30;53368.28;71734479;4874735346.76;53525.25;51890.72;1477.56;$BKTi;10311.52;4668950;329000118.66;10436.17;10297.91;-35.20;$OGTi;11754.81;10829158;1219095457.60;11760.57;11236.79;518.02;$KMIALLSHR;16063.07;103187524;6288495565.06;16068.78;15689.60;373.47;$NITPGI;7673.27;22815330;3110818957.76;7683.65;7518.72;154.55;$UPP9;10231.75;17006141;1953438160.01;10255.69;10038.65;193.10;$|*";
    // prettier-ignore
    const expected = [
      { symbol: "KSE100", price: "33156.90", volume: "110812978", value: "6893418036.43", high: "33156.90", low: "32553.39", change: "603.51" },
      { symbol: "ALLSHR", price: "23371.31", volume: "140204628", value: "7692212329.73", high: "23371.31", low: "22977.71", change: "393.60" },
      { symbol: "KSE30", price: "14574.58", volume: "72258848", value: "5333873712.23", high: "14593.24", low: "14281.23", change: "293.35" },
      { symbol: "KMI30", price: "53368.28", volume: "71734479", value: "4874735346.76", high: "53525.25", low: "51890.72", change: "1477.56" },
      { symbol: "BKTi", price: "10311.52", volume: "4668950", value: "329000118.66", high: "10436.17", low: "10297.91", change: "-35.20" },
      { symbol: "OGTi", price: "11754.81", volume: "10829158", value: "1219095457.60", high: "11760.57", low: "11236.79", change: "518.02" },
      { symbol: "KMIALLSHR", price: "16063.07", volume: "103187524", value: "6288495565.06", high: "16068.78", low: "15689.60", change: "373.47" },
      { symbol: "NITPGI", price: "7673.27", volume: "22815330", value: "3110818957.76", high: "7683.65", low: "7518.72", change: "154.55" },
      { symbol: "UPP9", price: "10231.75", volume: "17006141", value: "1953438160.01", high: "10255.69", low: "10038.65", change: "193.10" },
    ];
    assert.deepEqual(Parser.exchange(line), expected);
  });
});

describe("Parse Closing Data", () => {
  it("should parse closing data", () => {
    const line =
      "CLP|SHNI;REG;2.78;|*CLP|MLCF-MAY;FUT;27.21;|*CLP|TRPOL;REG;5.92;|*CLP|SMBL;REG;1.46;|*CLP|AGSML;REG;1.99;|*";

    const expected = [
      { symbol: "SHNI", market: "REG", close: "2.78" },
      { symbol: "MLCF-MAY", market: "FUT", close: "27.21" },
      { symbol: "TRPOL", market: "REG", close: "5.92" },
      { symbol: "SMBL", market: "REG", close: "1.46" },
      { symbol: "AGSML", market: "REG", close: "1.99" },
    ];
    assert.deepEqual(Parser.closing(line), expected);
  });
});
