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
    'https://www.alphavantage.co/query?function=HT_PHASOR&symbol=MSFT&interval=weekly&series_type=close&apikey=demo'
    'https://www.alphavantage.co/query?&symbol=MSFT&interval=weekly&apikey=demo'

  Notes:
    Alpha Vantage requests a call frequency limit of < 200/minute.
    A batch of ~400 calls results in 503 Service Unavailable responses.
*/

const tickers = require('./stockList.js');
const fetchStock = require('./src/fetchDataForOneStock.js');
const createThrottle = require('./src/createThrottle.js');
const filterResults = require('./src/filterResults.js');
const printToScreen = require('./src/printResults.js');
const writeToCsv = require('./src/writeCSV.js');
const throttle = createThrottle(1, 1900);
const log = console.log;
const data = require('./src/stockData.js');

// Date is passed in from command line in format 'YYYY-MM-DD'.
// The filter string is evaluated in filterResults.js
const filter = process.argv[2] ? [
  'signal.recentHitsOnGreaterVolumeCount === signal.recentHitsCount',
  'signal.recentHitsCount > 0',
  'signal.absorptionVolume === true',
  'signal.belowAvgVol === true',
  'signal.allRecentHitsDecreasing === true',
  'signal.outerPivotOnLowerVolume === true',
  'signal.date === process.argv[2]'
].join(' && ') : undefined;

(function() {

  // Create an array containing a promise for each ticker request.
  // Adds rate-limiting per data source's request; < 200 requests per minute
  // Requests get individual catch blocks, so if one fails the rest can continue.
  const tickerRequests = tickers.map(async (ticker) => {
    try {
      await throttle();
      return await fetchStock(ticker);
    } catch (err) {
      log(err);
    }
  });

  Promise.all(tickerRequests)
    .then(() => {
      log(`\n\x1b[31m Fetch complete. \x1b[0m`);
      log('Retries: ', data.retries);
    })
    .then(() => {
      if (data.retries.length) {
        const retryRequests = data.retries.map(ticker => fetchStock(ticker).catch(e => log(e)));
        // const retries = retryRequests.map(p => p.catch(err => null))
        // Adds individual catch for each retry, and sets null value so rest can continue if retry also results in error.
        return Promise.all(retryRequests);
      }
    })
    .then(() => {
      log('\n\x1b[31m' + 'Retries complete.' + '\x1b[0m');

      let results;

      if (filter) {
        results = filterResults(filter);
      }
      else {
        results = data.allSignals;
        log('\n\x1b[31m' + 'No search filter provided. All results: ' + '\x1b[0m' + '\n');
      }

      if (results.length) {
        log('\n\x1b[31m' + 'Search Results:' + '\x1b[0m');
        printToScreen(results);
        writeToCsv(results);

        if(every(results, allResultsShort) || every(results, allResultsLong)) {
          log('\n\x1b[32m' + 'All results agree. This has been a reliable signal about next trading day for the market' + '\x1b[0m');
        }
      }
      else {
        log('\n\x1b[31m' + 'No results.' + '\x1b[0m');
      }
    })
    .catch(e => log(e));
})();


// Helper functions.
function every(arr, filter) {
  let result = true;
  for (const element of arr) {
    if (filter(element) === false) {
      result = false;
    }
  }
  return result;
}

function allResultsShort(result) {
  return result.trade === 'short';
}

function allResultsLong(result) {
  return result.trade === 'long';
}
