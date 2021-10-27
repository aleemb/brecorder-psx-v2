const net = require("net");

/**
 *
 *
 * Parses the stream of strings into JSON objects
 *
 *
 */
module.exports = Feed = {
  // Time to wait before each reconnection attempt
  reconnectTimeoutMs: 2000,

  // How often we send keepalive's to detect disconnection
  keepAliveTimeoutMs: 1000,

  /**
   * Sockets API Reference:
   * https://nodejs.org/api/net.html#net_event_data
   *
   * Sockets Example:
   * https://gist.github.com/sid24rane/2b10b8f4b2f814bd0851d861d3515a10#file-net-js-L51
   *
   * Reconnection Example:
   * https://gist.github.com/sio2boss/6334089
   *
   * NetCat BR/PSX Server Testing:
   * nc -v -w120 203.170.76.27 9060
   */
  listen: (host, port, callback) => {
    // CLIENT/LISTENER
    const client = new net.Socket();

    // DEBUG: d() timestamp helper
    const d = () => new Date().toISOString().substr(12, 11);

    // KEEP-ALIVE. If data send fails, we know server went away
    setInterval(() => {
      try {
        client.write("\0");
      } catch (e) {
        console.error("Server Went Away!");
      }
    }, Feed.keepAliveTimeoutMs);

    // SETUP
    client.setEncoding("utf8");
    client.on("connect", (data) => console.log(d(), "Connected", host, port));
    client.on("ready", (data) => console.log(d(), "Ready"));
    client.on("error", (error) => console.log("Error : " + JSON.stringify(error)));
    client.on("end", (data) => console.log("Socket ended from other end!"));
    client.on("close", () =>
      setTimeout(() => console.log("Closed. Reconnecting...") || client.connect(port, host), Feed.reconnectTimeoutMs)
    );

    // PARSE
    const previousCache = {};
    client.on("data", function (data) {
      let tick;

      try {
        const lines = data.split("\n");
        lines.forEach(line => {
          try {
            line = line.replace(/\0/gi,'');
            if (line) {
              tick = JSON.parse(line);
              // if (tick.sym == 'GATM') console.log(line);
              if (['SSHR','SIDX'].includes(tick.chan) && tick.md && (tick.md.price || tick.md.index)) {
                const out = {
                  symbol: tick.sym,
                  open:  tick.md.open,
                  high:  tick.md.high,
                  low:  tick.md.low,
                  close: tick.prev_close,
                  change: tick.md.fluc1,
                  price: tick.md.price || tick.md.index
                };
                let outString = JSON.stringify(out);
                if (previousCache[out.symbol] != outString) {
                  callback(out);
                  previousCache[out.symbol] = outString;
                } else {
                  // console.log("\n\nSKIP:\n", previousCache[out.symbol], "\n", outString);
                }
              }
            }
          } catch (err) {
            console.log("ERROR PARSING LINE: " + line + ".");
            return;
          }
        });


        // console.log(tick.chan);
        // const ticks = Feed[type](data);
        // We only care about REG ticks from "company" data
        // if (type == "companies" && ticks.length && ticks[0].market != "REG") return;
      } catch (error) {
        console.error("ERROR", tick, error);
      }
    });

    client.connect(port, host);
  },

  /**
   * Multiple:
   * FEED|GSKCH;ODL;OPN; ;50;228.00;235.00;5;233.00;69;11:55:47;228.37;+;231.68;233.00;225.00;4.63;180;6;230.00;|*FEED|FNEL;ODL;OPN; ;499;6.37;8.98;1;0.00;0;;7.35;=;0.00;0.00;0.00;0.00;0;0;;|*FEED|OGDC-MAY;FUT;OPN; ;5000;93.31;93.62;500;93.50;1000;12:01:48;94.16;-;93.35;94.00;92.70;-0.66;287000;200;93.50;|*FEED|HASCOL;REG;OPN; ;7500;14.32;14.33;500;14.33;500;12:03:47;14.5;-;14.44;14.60;14.25;-0.17;3243500;994;14.27;|*FEED|UBL;REG;OPN; ;299;101.11;101.40;4432;101.11;1;12:03:47;103.91;-;102.06;104.45;101.00;-2.80;545928;650;104.45;|*FEED|NML;REG;OPN; ;3600;69.10;69.29;100;69.10;1000;12:03:48;66.45;-;68.21;69.20;66.95;2.65;258500;296;66.97;|*FEED|BOP;REG;OPN; ;28000;8.55;8.61;10000;8.60;500;12:03:47;8.51;-;8.60;8.64;8.55;0.09;343500;67;8.60;|*FEED|SYS;REG;OPN; ;2600;136.50;137.88;100;136.00;200;12:00:26;134.94;+;136.22;137.99;134.89;1.06;31800;68;135.00;|*FEED|GGGL;REG;OPN; ;500;11.11;11.25;2000;11.16;500;12:03:23;11.48;-;11.28;11.50;11.16;-0.32;82000;44;11.48;|*FEED|DSIL;REG;OPN; ;10500;1.50;1.55;5000;1.51;500;11:43:28;1.54;-;1.52;1.52;1.51;-0.03;2500;3;1.52;|*FEED|STCL;REG;OPN; ;500;7.15;7.20;1000;7.16;1500;12:03:42;7.17;-;7.20;7.28;7.16;-0.01;81500;29;7.20;|*FEED|GSKCH;ODL;OPN; ;50;228.00;235.00;5;233.00;69;11:55:47;228.37;+;231.68;233.00;225.00;4.63;180;6;230.00;|*FEED|TICL;ODL;OPN; ;22;175.00;202.00;11;0.00;0;;191.04;=;0.00;0.00;0.00;0.00;0;0;;|*FEED|NETSOL-MAY;FUT;OPN; ;5000;42.42;42.90;500;42.10;500;11:28:44;42.95;-;42.57;42.75;42.10;-0.85;24000;21;42.75;|*FEED|NML-MAY;FUT;OPN; ;1000;69.39;69.69;500;69.50;1000;12:03:41;67.01;+;68.70;69.50;67.87;2.49;28000;22;67.87;|*FEED|LUCK-MAY;FUT;OPN; ;500;453.10;453.70;1000;453.00;500;11:59:17;445.6;-;452.93;457.00;448.00;7.40;460500;538;449.95;|*FEED|BOP-MAY;FUT;OPN; ;6500;8.59;8.69;5000;8.60;10000;11:27:26;8.55;-;8.65;8.70;8.60;0.05;69500;16;8.70;|*
   *
   * Single:
   * FEED|FNEL;ODL;OPN; ;499;5.56;9.18;380;0.00;0;;7.35;=;0.00;0.00;0.00;0.00;0;0;|*
   */
  companies: (data) => {
    // Remove NULL \u0000
    // https://stackoverflow.com/a/22809513/50475
    data = data.replace(/\0/g, "");

    const lines = data.split(/\|\*/); // split
    lines.pop(); // remove last empty record due to trailing |*

    const results = {};

    lines.forEach((line) => {
      if (line.indexOf("FEED|") === -1) return;

      line = line.replace("FEED|", "");
      const values = line.split(";");

      const info = {
        symbol: values[0], // 2 Symbol Code (Scrip Code)
        // market: values[1], // 3 Market Code [REG COT FUT IPO OTC CFS CSF SIF ODL IOM]
        // state: values[2], // 4 Symbol State [LOD PRI PRE OPN SUS PRC CLS PCL]
        // flag: values[3], // 5 Symbol Flag (SPOT OR " ")
        // bidv: values[4], // 6 Bid Volume (Current Top Buyer Volume)
        // bidp: values[5], // 7 Bid Price (Current Top Buyer Price)
        // askp: values[6], // 8 Ask Price (Current Top Seller Price)
        // askv: values[7], // 9 Ask Volume (Current Top Seller Volume)
        price: values[8], // 10 Last Trade Price (Last Trade Price)
        // quantity: values[9], // 11 Last Trade Volume (Last Trade Volume)
        time: values[10], // 12 Last Trade Time (Last Trade Time)
        close: values[11], // 13 Last Day Close Price (Previous day close price)
        // direction: values[12], // 14 Symbol Direction [+ - =]
        // avg: values[13], // 15 Average Price (Scrip Average Price)
        high: values[14], // 16 High Price (Scrip High Price)
        low: values[15], // 17 Low Price (Scrip Low Price)
        change: values[16], // 18 Net Change (Scrip Net Change)
        // volume: values[17], // 19 Total Traded Volume (Scrip Total Traded Volume)
        // trades: values[18], // 20 Total Trades (Scrip Total Trades)
        open: values[19], // 21 Open Price (Scrip Open Price
      };

      results[info.symbol] = info;
    });

    return results;
  },

  /**
   *
   * Multiple:
   * EXG-STAT|198;99;19;316;KSE100;33156.90;110812978;6893418036.43;33156.90;32553.39;603.51;$ALLSHR;23371.31;140204628;7692212329.73;23371.31;22977.71;393.60;$KSE30;14574.58;72258848;5333873712.23;14593.24;14281.23;293.35;$KMI30;53368.28;71734479;4874735346.76;53525.25;51890.72;1477.56;$BKTi;10311.52;4668950;329000118.66;10436.17;10297.91;-35.20;$OGTi;11754.81;10829158;1219095457.60;11760.57;11236.79;518.02;$KMIALLSHR;16063.07;103187524;6288495565.06;16068.78;15689.60;373.47;$NITPGI;7673.27;22815330;3110818957.76;7683.65;7518.72;154.55;$UPP9;10231.75;17006141;1953438160.01;10255.69;10038.65;193.10;$|*
   *
   * Single:
   *  198;99;19;316;KSE100;33156.90;110812978;6893418036.43;33156.90;32553.39;603.51;
   *  ALLSHR;23371.31;140204628;7692212329.73;23371.31;22977.71;393.60;
   *  KSE30;14574.58;72258848;5333873712.23;14593.24;14281.23;293.35;
   *  KMI30;53368.28;71734479;4874735346.76;53525.25;51890.72;1477.56;
   *  BKTi;10311.52;4668950;329000118.66;10436.17;10297.91;-35.20;
   *  OGTi;11754.81;10829158;1219095457.60;11760.57;11236.79;518.02;
   *  KMIALLSHR;16063.07;103187524;6288495565.06;16068.78;15689.60;373.47;
   *  NITPGI;7673.27;22815330;3110818957.76;7683.65;7518.72;154.55;
   *  UPP9;10231.75;17006141;1953438160.01;10255.69;10038.65;193.10
   *
   * Single With Summary removed from first:
   *  KSE100;33156.90;110812978;6893418036.43;33156.90;32553.39;603.51;
   *  ALLSHR;23371.31;140204628;7692212329.73;23371.31;22977.71;393.60;
   *  KSE30;14574.58;72258848;5333873712.23;14593.24;14281.23;293.35;
   *  KMI30;53368.28;71734479;4874735346.76;53525.25;51890.72;1477.56;
   *  BKTi;10311.52;4668950;329000118.66;10436.17;10297.91;-35.20;
   *  OGTi;11754.81;10829158;1219095457.60;11760.57;11236.79;518.02;
   *  KMIALLSHR;16063.07;103187524;6288495565.06;16068.78;15689.60;373.47;
   *  NITPGI;7673.27;22815330;3110818957.76;7683.65;7518.72;154.55;
   *  UPP9;10231.75;17006141;1953438160.01;10255.69;10038.65;193.10
   */
  exchange: (data) => {
    // Remove NULL \u0000
    // https://stackoverflow.com/a/22809513/50475
    data = data.replace(/\0/g, "");
    data = data.replace("EXG-STAT|", "");
    data = data.replace("|*", "");

    const lines = data.split(/\$/); // split
    lines.pop(); // remove last empty record due to trailing $

    if (!lines) return;

    const summary = lines[0].split(";").slice(0, 4);
    const advances = summary[0]; // Total Scrip Advance
    const declines = summary[1]; // Total Scrip Decline
    const unchanged = summary[2]; // Total Scrip Unchanged
    const total = summary[3]; // Total Scrips

    // console.log({ advances, declines, unchanged, total });

    // remove the first four ; seperated entities from the first line (summary)
    lines[0] = lines[0].replace(/([^;]+;){4}/, "");

    const results = {};

    lines.forEach((line) => {
      const values = line.split(";");

      const info = {
        symbol: values[0], // 6 Index Code [KSE30, KSE100, ALLSHR, KMI30, OGTi, BKTi, KMIALLSHR, UBLETF, NITETF]
        price: values[1], // 7 Current Index Value
        volume: values[2], // 8 Total Volume Traded in Index Companies
        value: values[3], // 9 Total Value Traded in Index Companies
        high: values[4], // 10 High Index in a day
        low: values[5], // 11 Low Index in a day
        change: values[6], // 12 Total Net Change as compare to previous day index
      };

      results[info.symbol] = info;
    });

    return results;
  },

  /**
   *
   * Multiple:
   * CLP|SHNI;REG;2.78;|*CLP|MLCF-MAY;FUT;27.21;;|*CLP|TRPOL;REG;5.92;|*CLP|SMBL;REG;1.46;|*CLP|AGSML;REG;1.99;|*CLP|BTL;REG;237.15;|*CLP|STPL;REG;7.67;|*CLP|SKRS;REG;10.10;|*CLP|CYAN;REG;23.63;|*CLP|BWCL;REG;126.50;|*CLP|NCPL;REG;13.20;|*CLP|STCL;REG;7.30;|*CLP|BWHL;REG;56.3891;|*CLP|MTL;REG;658.16;|*CLP|BPL;REG;23.99;|*CLP|PACE;REG;1.88;|*CLP|SHFA;REG;239.42;|*CLP|GSKCH;REG;230.76;|*CLP|MFFL;REG;205.45;|*CLP|EFUG;REG;91;|*CLP|CTM;REG;2.70;|*CLP|EXIDE;REG;227.60;|*CLP|786;REG;37.75;|*CLP|KOHC;REG;139.79;|*CLP|SCBPL;REG;20;|*CLP|ALTN;REG;24;|*CLP|ILP;REG;39.60;|*CLP|AGL;REG;3.07;|*CLP|AICL;REG;33;|*CLP|AGP;REG;86.04;|*CLP|NPL;REG;19.41;|*CLP|PIL;REG;0.76;|*CLP|DCL;REG;7.58;|*CLP|GGL;REG;9.90;|*CLP|DCR;REG;11.01;|*CLP|SPWL;REG;17;|*CLP|LPL;REG;10.53;|*CLP|DYNO;REG;91.86;|*CLP|SPEL;REG;37.98;|*CLP|BGL;REG;4.17;|*CLP|HGFA;REG;7.55;|*CLP|DOL;REG;26.98;|*CLP|TRIPF;REG;86.50;|*CLP|KASBM;REG;0.95;|*CLP|BIPL;REG;8.76;|*CLP|ATBA;REG;150.50;|*CLP|BYCO;REG;6.04;|*CLP|FCEPL;REG;64.27;|*CLP|MLCF;REG;27.10;|*CLP|ELCM;REG;23.90;|*CLP|MCB;REG;158.22;|*CLP|BOK;REG;13.90;|*CLP|SHEL;REG;130.69;|*CLP|HTL;REG;27.03;|*CLP|BOP;REG;8.41;|*CLP|ELSM;REG;69.60;|*CLP|SMTM;REG;2.99;|*CLP|SYS;REG;147.75;|*CLP|PKGP;REG;12.95;|*CLP|MUGHAL;REG;41.79;|*CLP|REDCO;REG;5.96;|*CLP|NICL;REG;59.43;|*CLP|WAHN;REG;204;|*CLP|DINT;REG;61.05;|*CLP|FATIMA;REG;23.25;|*CLP|ZIL;REG;120.25;|*CLP|MEBL;REG;63.49;|*CLP|JLICL;REG;328;|*CLP|HUMNL;REG;4.81;|*CLP|NCL;REG;31.13;|*CLP|ICL;REG;25.17;|*CLP|ICI;REG;655.22;|*CLP|SAIF;REG;16.60;|*CLP|IGIHL;REG;244.77;|*CLP|ALNRS;REG;50.15;|*CLP|PCAL;REG;102.12;|*CLP|TPL;REG;3.41;|*CLP|WTL;REG;0.80;|*CLP|MDTL;REG;1.10;|*CLP|OTSU;REG;300;|*CLP|LOTCHEM;REG;9.52;|*CLP|AGIC;REG;20.50;|*CLP|AKZO;REG;270.01;|*CLP|UBDL;REG;20.20;|*CLP|ORIXM;REG;16.60;|*CLP|DGKC;REG;84.98;|*CLP|NEXT;REG;7.24;|*CLP|LEUL;REG;10.55;|*CLP|RPL;REG;19.94;|*CLP|HICL;REG;8;|*CLP|SILK;REG;0.70;|*CLP|SINDM;REG;7.66;|*CLP|SPLC;REG;0.48;|*CLP|FECM;REG;2.03;|*CLP|MQTM;REG;35;|*CLP|PTC;REG;7.65;|*CLP|PIOC;REG;56.28;|*CLP|FNBM;REG;0.75;|*CLP|QUICE;REG;3.06;|*CLP|HUBC;REG;80.39;|*CLP|PPL;REG;84.98;|*CLP|KAPCO;REG;22.41;|*CLP|SPL;REG;17;|*CLP|FECTC;REG;24.18;|*CLP|ESBL;REG;7.70;|*CLP|THALL;REG;312.06;|*CLP|MERIT;REG;7.91;|*CLP|MACTER;REG;80;|*CLP|TGL;REG;70.30;|*CLP|MSOT;REG;59.05;|*CLP|DWTM;REG;1.20;|*CLP|AGTL;REG;275;|*CLP|DSL;REG;3.05;|*CLP|CSIL;REG;1.42;|*CLP|CRTM;REG;19.99;|*CLP|GVGL;REG;38.10;|*CLP|PICT;REG;170;|*CLP|HIFA;REG;2.81;|*CLP|CHAS;REG;62.50;|*CLP|GGGL;REG;10.84;|*CLP|WAVES;REG;18.53;|*CLP|KSBP;REG;130.03;|*CLP|PSMC;REG;159.58;|*CLP|FABL;REG;13.47;|*CLP|CEPB;REG;58.97;|*CLP|KOIL;REG;2.98;|*CLP|INDU;REG;904.34;|*CLP|PAKD;REG;43.99;|*CLP|SSGC;REG;13.39;|*CLP|FFC;REG;110.01;|*CLP|HBL;REG;100.32;|*CLP|PAKOXY;REG;120.82;|*CLP|GWLC;REG;18.14;|*CLP|SERF;REG;3.20;|*CLP|HINOON;REG;559.42;|*CLP|PSX;REG;9.78;|*CLP|HCAR;REG;169.91;|*CLP|PSO;REG;144.56;|*CLP|HINO;REG;316.25;|*CLP|MARI;REG;1090.73;|*CLP|AHCL;REG;26.40;|*CLP|DFSM;REG;1.29;|*CLP|MUREB;REG;586.65;|*CLP|IBLHL;REG;61.29;|*CLP|FUDLM;REG;6.50;|*CLP|SNBL;REG;9.85;|*CLP|GHGL;REG;43.02;|*CLP|GHNL;REG;51.72;|*CLP|NML;REG;72.43;|*CLP|UNIC;REG;7;|*
   *
   * Single:
   *  CLP|SHNI;REG;2.78;
   *  CLP|MLCF-MAY;FUT;27.21;
   */
  closing: (data) => {
    // Remove NULL \u0000
    // https://stackoverflow.com/a/22809513/50475
    data = data.replace(/\0/g, "");

    const lines = data.split(/\|\*/); // split
    lines.pop(); // remove last empty record due to trailing |*

    const results = {};

    lines.forEach((line) => {
      if (line.indexOf("CLP|") === -1) return;

      line = line.replace("CLP|", "");
      const values = line.split(";");

      const info = {
        symbol: values[0], // 2 Symbol Code (Scrip Code)
        market: values[1], // 3 Market Code [REG COT FUT IPO OTC CFS CSF SIF ODL IOM]
        close: values[2], // 4 Symbol Close Price
      };

      results[info.symbol] = info;
    });

    return results;
  },
};
