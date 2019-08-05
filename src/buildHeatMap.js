const fs = require("fs");
const state = require("./stockstate.js");


// state.quotes[ticker]
// state.quotes[ticker]["data"] // loop over and collect all [OHLC, V]
// state.quotes[ticker]["heatmap"] // store here

  // Experimental; collect all OHLC price points to generate a heatmap of support/resistance.
  // This is basically data for a volume-by-price chart.
function buildHeatMap (ticker) {
  let t = state.quotes[ticker];
  t["heatmap"] = t["heatmap"] || [];
  let h, l, c, v;
  for (let i = 0; i < t["data"].length; i++) {
    h = t["data"][i]["h"];
    l = t["data"][i]["l"];
    c = t["data"][i]["c"];
    v = t["data"][i]["v"];
    t["heatmap"].push([h, v]);
    t["heatmap"].push([l, v]);
    t["heatmap"].push([c, v]);
  }
  t["heatmap"].sort((entry, nextEntry) => {
    return entry[0] - nextEntry[0];
  })
  // console.log(t["heatmap"]);


  // Experimental; generates heatmap CSV data for visualization
  // Create new file, overwrite existing old results.
  // fs.writeFileSync("heatmap.csv", "", "utf8");
  // fs.appendFileSync("heatmap.csv", "symbol,price,volume\n", "utf8");
  // for (let j = 0; j < state.quotes[ticker]["heatmap"].length; j++) {
  //   let line = [ 
  //     ticker,
  //     state.quotes[ticker]["heatmap"][j][0],
  //     state.quotes[ticker]["heatmap"][j][1]
  //   ].join(",")
  //   fs.appendFile("heatmap.csv", line + "\n", "utf8", (err) => {
  //     if (err) throw err;
  //   });
  // }
}

module.exports = buildHeatMap;