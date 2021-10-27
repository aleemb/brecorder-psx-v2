// IMPORTS
const Feed = require("./Feed");

// CONFIG / ARGS
const host = "203.170.76.27";
const type = process.argv[2];

Feed.listen(host, type, (ticks) => {
  // DEBUG: d() helper
  const d = () => new Date().toISOString().substr(12, 11);

  // DEBUG exchange & closing
  if (type == "exchange" || type == "closing") {
    ticks.forEach((t) => console.log(d(), t.symbol, "\t", t.price || t.close, "  \t", t.change || ""));
  }

  // DEBUG companies
  if (type == "companies") {
    for (tick in ticks) {
      let t = ticks[tick];
      console.log(d(), t.symbol, "\t", t.price || t.close, "  \t", t.change || "");
    }
  }
});
