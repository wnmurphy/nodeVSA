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

let rp = require("request-promise");
let myTickerList = require("./stockList.js");
let CONFIG = require("./config.js")
let stockData = {};


// Retrieves data for one stock ticker.
let getStockData = (ticker) => {
  console.log("Getting data for: ", "\x1b[34m", ticker, "\x1b[0m");

  rp({
    uri: "https://www.alphavantage.co/query",
    json: true,
    qs: {
      apikey: CONFIG.API_KEY,
      function: "TIME_SERIES_DAILY",
      symbol: ticker
    },
    transform: transformData
  })
    // Add our transformed data to a container in storage...
    .then((data) => {
      // Initialize quote container if this is the first run...
      stockData.quotes = stockData.quotes || {};
      // Initialize a new container for this stock...
      stockData.quotes[ticker] = {};
      stockData.quotes[ticker]["days"] = data;

    })
    // Mark pivot highs and lows in data...
    .then(() => {
      markAllPivots(stockData.quotes[ticker]["days"], ticker);
    })
    .then(() => {
      // Scan for supply tests...
      scanForSupplyTests(stockData.quotes[ticker]["pivotLows"], ticker);
      // Scan for demand tests...
      scanForDemandTests(stockData.quotes[ticker]["pivotHighs"], ticker);
      // Notify the user we're done for this ticker.
      dataHasLoaded(ticker);
    })
    .catch((err) => {
      console.error("## Ticker:", ticker, "\n## Error:", err);
    })
};


// Fetches data for an array of stock symbols as strings.
  // Adds rate-limiting per data source's request.
    // ~200 requests per minute; let's call it 195.
    // (60,000 ms/minute)/195 requests = 307ms per request.
function retrieveDataForAllStocks(arrayOfStockTickers) {
  for (let i = 0; i < arrayOfStockTickers.length; i++) {
    setTimeout(getStockData.bind(null, arrayOfStockTickers[i]), i*307);
  }
};


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
  stockData.signals = stockData.signals || [];

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
        stockData.signals.push(currentSignal);
      }
  }
}


function scanForDemandTests (pivots, ticker) {
  // Init signals array if undefined.
  stockData.signals = stockData.signals || [];

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
      stockData.signals.push(currentSignal);
    }
  }
}


// Searches through all loaded signals by ticker, date, or trade direction.
  // Should be run once we've finished retrieiving all data from server.
function searchsignalsAfterFetchComplete (filter) {
  // Defaults the search results to a list of all signals.
  let searchResults;
  if (filter !== undefined) {
    searchResults = stockData.signals.filter(function(signal){
      return eval(filter);
    });
  } else {
    searchResults = stockData.signals;
  }
  console.log("## Search Results:\n\n", searchResults);
};


// Tells user this request has finished.
function dataHasLoaded (ticker) {
  console.log("Got data for: ", "\x1b[34m", ticker, "\x1b[0m");

  let filter = "signal.trade === 'long' && signal.date === '2017-07-05'";
  console.log(searchsignalsAfterFetchComplete(filter));
  // console.log(stockData);
  debugger;
};


retrieveDataForAllStocks(myTickerList);


/*

  TODO:
  
  1. Promisify helper functions, so we can:
    - do interesting things once all of the stock data has fully loaded.
    - sort the date in different ways instead of by stock.
  
  2. Find a better way to detect if pivot is within the range of any prior pivot.
    Add percentage multiplier limit?
    Search all prior pivots for a stock to grab any within X percent of current pivot price?

    Goal: Calculate "closeness".
    For each pivot, calculate 5% of the day's range for this pivot.
    Calculate "closeness range" by adding and subtracting this from the pivot high (if pivotHigh) or low (if pivotLow).
    To determine signal:
      - look back at all prior pivots for this stock,
      - Check if any are "close" to the current pivot high/low
      (filter all prior pivotLows for low within "closeness" range)
      (filter all prior pivotHighs for high within "closeness" range)
      - Add to stockData.signals if there is at least one pivot in the last 4 months "close" to this pivot.

    Hypothesis: higher volume on any pivot at the same level is significant, not just for most recent.
      For each stock, for each pivot, look at all prior pivots for the stock.

  3. Create a GUI so user can:
    - Update data for all stocks.
    - Update data for stock (ticker)
    - Search signals by date/symbol/trade direction (search term).
    - See all signals.
    - See all data for one stock (ticker).
    - Quit.

  Backburner:
    - could combine supply and demand signal builders into one function that takes a 'trade direction' parameter.
*/
