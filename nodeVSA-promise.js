/*
  Goal: Create a a node.js script I can run at 12:30pm to find stock trading setups.
  
  The setup I'm looking for is basically what Volume Spread Analysis (VSA) calls a supply (or demand) test.
  
  In English:
    1. Find a pivot low.
    2. Draw a line from the low to the left.
    3. The line should skip at least 1 day.
    4. If the line hits the range of a lower pivot low with higher volume, watch.
    5. When the price exits the current channel, buy.

  This stock data is perfect for guiding an MVP, because it contains both a long and short setup:
    2017-06-13: short setup
    2017-06-21: long setup

    See http://imgur.com/SHCYUgV for a chart of these two setups.

  Data source: 
    alphavantage.co's API @ https://www.alphavantage.co/documentation/

  Example URLs with query:
    "https://www.alphavantage.co/query?function=HT_PHASOR&symbol=MSFT&interval=weekly&series_type=close&apikey=demo"
    "https://www.alphavantage.co/query?&symbol=MSFT&interval=weekly&apikey=demo"
  
  Notes:
    Alpha Vantage requests a call frequency limit of < 200/minute.
    A batch of ~400 calls results in 503 Service Unavailable responses.
*/

const RP = require("request-promise");
const TICKER_LIST = require("./stockList.js");
const CONFIG = require("./config.js")
let stockData = {
  quotes: [],
  signals: {}
};


// Requests data for one stock ticker with a promise.
let getDataForStock = (ticker) => new Promise((resolve, reject) => {

  console.log("Getting data for: ", "\x1b[34m", ticker, "\x1b[0m");
  RP({
    uri: "https://www.alphavantage.co/query",
    json: true,
    qs: {
      apikey: CONFIG.API_KEY,
      function: "TIME_SERIES_DAILY",
      symbol: ticker
    },
    transform: transformData
  })
  // Add our transformed data to a container in storage.
  .then((data) => {
    // Initialize a new container for this stock.
    stockData.quotes[ticker] = {};
    stockData.quotes[ticker]["data"] = data;
  })
  // Mark pivots.
  .then(() => {
    markAllPivots(stockData.quotes[ticker]["data"], ticker);
  })
  .then(() => {
    // Scan for tests.
    scanForSupplyTests(stockData.quotes[ticker]["pivotLows"], ticker);
    scanForDemandTests(stockData.quotes[ticker]["pivotHighs"], ticker);
    console.log("Got data for: ", "\x1b[34m", ticker, "\x1b[0m");
    resolve();
  })
  .catch((err) => {
    console.error("## Ticker:", ticker, "\n## Error:", err);
    reject(err);
  })
}); 
    




// Promise throttler (courtesy Pasha Rumkin)
// https://stackoverflow.com/questions/38048829/node-js-api-request-limit-with-request-promise
function createThrottle(series = 10, timeout = 1000) {
  var seriesCounter = 0;
  var delay = 0;

  return () => {
    return new Promise((resolve) => {
      if (--seriesCounter <= 0) {
        delay += timeout;
        seriesCounter = series;
      }

      setTimeout(resolve, delay);
    });
  };
}


function start () {

  // Adds rate-limiting per data source's request; ~200 requests per minute
  var throttle = createThrottle(3, 1e3); // 3 requests every 1 second
  
  // Create an array containing a promise for each ticker request.
  let promisifiedTickerArray = TICKER_LIST.map(
    (ticker) => throttle().then(() => (
      getDataForStock(ticker)
      )
    )
  );
  
  // Main logic.
  Promise.all(promisifiedTickerArray)
  .then(()=>{
    console.log("\n" + "\x1b[31m" + "## All ticker data retrieved." + "\x1b[0m" + "\n");
  })
  .then(()=>{
    // If user passes in a search string at command line, use it.
    if (process.argv[2]) {
      let searchFilter = process.argv[2];
      return searchAllSignalsAfterFetchComplete(searchFilter);
    } else {
    // Otherwise show all signals.
      console.log(stockData.allSignals);
    }
  })
  .catch((err)=>{
    console.error(err);
  });
}
start();


// Takes a parsed JSON object, and transforms it.
  // (Passed as the 'transform' option to request-promise.)
function transformData (stock) {
  let transformed = [];
  let timeSeries = stock["Time Series (Daily)"];
  for (let date in timeSeries) {
    let dayOfData = {};
    dayOfData.date = date;
    dayOfData.h = parseFloat(timeSeries[date]["2. high"]);
    dayOfData.l = parseFloat(timeSeries[date]["3. low"]);
    dayOfData.c = parseFloat(timeSeries[date]["4. close"]);
    dayOfData.v = parseFloat(timeSeries[date]["5. volume"]);
    dayOfData.pivotHigh = false;
    dayOfData.pivotLow = false;
    transformed.push(dayOfData); }
  // Reverse array, so most recent day is at last index.
  return transformed.reverse();
}


// Identifies pivot highs and lows, and set pivot flags on that day.
function markAllPivots (daysArray, ticker) {
  // Init pivotHighs and pivotLows arrays if undefined.
  stockData.quotes[ticker]["pivotHighs"] = stockData.quotes[ticker]["pivotHighs"] || [];
  stockData.quotes[ticker]["pivotLows"] = stockData.quotes[ticker]["pivotLows"] || [];

  // Mark pivot Highs
  for (let i = 1; i < daysArray.length; i++) {
    if (daysArray[i+1] === undefined) { // handle most recent day
      if (daysArray[i].h > daysArray[i-1].h) {
        daysArray[i].pivotHigh = true;
        stockData.quotes[ticker]["pivotHighs"].push(daysArray[i]);
      }
    } else {
      if (
        // If this day's high is greater than the prior day's high
        daysArray[i].h > daysArray[i-1].h &&
        // this day's high is also greater than the next day's high,
        daysArray[i].h > daysArray[i+1].h
      ) {
        // Then today is a pivot high.
        daysArray[i].pivotHigh = true;
        stockData.quotes[ticker]["pivotHighs"].push(daysArray[i]);
      }
    }
  }
  // Mark pivot Lows
  for (let i = 1; i < daysArray.length; i++) {
    if (daysArray[i+1] === undefined) { // handle most recent day
      if (daysArray[i].l < daysArray[i-1].l) {
        daysArray[i].pivotLow = true;
        stockData.quotes[ticker]["pivotLows"].push(daysArray[i]);
      }
    } else {
      if (
        // If this day's high is less than the prior day's high
        daysArray[i].l < daysArray[i-1].l &&
        // this day's high is also less than the next day's high,
        daysArray[i].l < daysArray[i+1].l
      ) { // Then today is a pivot low.
        daysArray[i].pivotLow = true;
        stockData.quotes[ticker]["pivotLows"].push(daysArray[i]);
      }
    }
  }
}


function scanForSupplyTests (pivots, ticker) {
  // Init signals array if undefined.
  stockData.allSignals = stockData.allSignals || [];

  // Find supply tests (long).
  for (let i = 1; i < pivots.length; i++) {
    // if previous pivot's volume is greater than current pivot's volume, and 
    // the previous pivot's low is less than current pivot's low
    if (
    // If previous pivot's v is greater than current pivot's v, and 
        pivots[i-1].v > pivots[i].v &&
    // the previous pivot's l is less than current pivot's l, and
        pivots[i-1].l < pivots[i].l &&
    // current pivot's low is less than previous pivot's high...
        pivots[i].l < pivots[i-1].h
    ) {
      // Build a new signal object...
        let currentSignal = {
          date: pivots[i].date.split(' ')[0], // Removes the random timestamp.
          symbol: ticker,
          trade: "long"
        };
      // ...and add it to our signals array.
        stockData.allSignals.push(currentSignal);
      }
  }
}


function scanForDemandTests (pivots, ticker) {
  // Init signals array if undefined.
  stockData.allSignals = stockData.allSignals || [];

  // Find demand tests (short).
  for (let i = 1; i < pivots.length; i++) {
    if (
    // If previous pivot's v is greater than current pivot's v, and 
        pivots[i-1].v > pivots[i].v &&
    // the previous pivot's h is greater than current pivot's h, and
        pivots[i-1].h > pivots[i].h &&
    // current pivot's high is greater than previous pivot's low...
        pivots[i].h > pivots[i-1].l
    ) {
    // Build a new signal object...
      let currentSignal = {
        date: pivots[i].date.split(' ')[0], // Removes the random timestamp.
        symbol: ticker,
        trade: "short"
      };
    // ...and add it to our signals array.
      stockData.allSignals.push(currentSignal);
    }
  }
}


// Searches through all loaded signals by ticker, date, or trade direction.
  // Should be run once we've finished retrieiving all data from server.
  // Example search filters:
  // "signal.date === '2017-07-07'"
  // "signal.symbol === 'AAPL' && signal.trade === 'long'"
function searchAllSignalsAfterFetchComplete (filter) {
  // Defaults the search results to a list of all signals.
  let searchResults;
  if (filter !== undefined) { 
    searchResults = stockData.allSignals.filter(function(signal){
      return eval(filter);
    });
  }
  console.log("\n" + "\x1b[31m" + "## Search Results:" + "\x1b[0m" + "\n", searchResults);
};