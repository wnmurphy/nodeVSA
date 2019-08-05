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
const state = require('./src/stockstate.js');

const createThrottle = require('./src/createThrottle.js');
const throttle = createThrottle(1, 1900);

const fetchStock = require('./src/fetchDataForOneStock.js');
const markAllPivots = require('./src/markAllPivots.js');
const buildSignals = require('./src/buildSignals.js');
const buildHeatmap = require('./src/buildHeatMap');
const findHits = require('./src/findHits.js');

const filterResults = require('./src/filterResults.js');
const printToScreen = require('./src/printResults.js');
const writeToCsv = require('./src/writeCSV.js');

const log = require('./src/logger.js');
const disk = require('./src/diskUtils.js');
const daysBetween = require('./src/daysBetween.js');


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
  // Requests get individual catch blocks, so if one fails the rest can continue.
  const tickerRequests = tickers.map(async (ticker) => {
    try {
      await throttle();

      // Check for local data for this ticker first before retrieval.
      const localFile = disk.readStockDataFromDisk(ticker);
      let parsedData = await fetchStock(ticker, needsFullRetrieval(localFile));
      // If local data exists, merge with fetched data.
      if (localFile.lastDateRetrieved && localFile.data) {
        parsedData = disk.mergeNewAndExistingData(ticker, parsedData, localFile.data);
      }
      disk.writeStockDataToDisk(ticker, parsedData);

      // Initialize ticker in state, and add parsed data for processing.
      initDataForStock(ticker, parsedData);
      processDataForStock(ticker, parsedData);
    } 
    catch (e) {
      log('warn', e, e.stack);
    }
  });


  // Execute all ticker requests, perform any needed retries, and apply search filter to signals.
  Promise.all(tickerRequests)
    .then(() => {
      log('info', 'Fetch complete.');
      if (state.retries.length) {
        log('info', `Retries: ${state.retries}`);
        const retryRequests = state.retries.map(ticker => fetchStock(ticker).catch(e => log('warn', e, e.stack)));
        // const retries = retryRequests.map(p => p.catch(err => null))
        // Adds individual catch for each retry, and sets null value so rest can continue if retry also results in error.
        return Promise.all(retryRequests).then(() => {
          log('info', 'Retries complete.');
        });
      }
    })
    .then(() => {
      let results;
      if (filter) {
        results = filterResults(filter);
      }
      else {
        results = state.allSignals;
        // console.log('\n\x1b[31m' + 'No search filter provided. All results: ' + '\x1b[0m' + '\n');
      }
      log('info', `Found ${results.length} outer pivots on lower volume.`);
      
      if (results.length) {
        console.log('\n\x1b[31m' + 'Search Results:' + '\x1b[0m');
        printToScreen(results);
        writeToCsv(results);
        if(every(results, allResultsShort) || every(results, allResultsLong)) {
          log('info', 'All results agree. This has been a reliable signal about next trading day for the market.');
        }
      }
      else {
        log('info', 'No results.');
      }
    })
    .catch(e => log('warn', e));
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

// Returns true if localFile.data doesn't exist (data not fetched before), or if date ('2019-01-02') was more than 100 days ago, otherwise false.
function needsFullRetrieval(localFile) {
  if (!localFile.data) {
    return true;
  }
  const mostRecentDate = localFile.lastDateRetrieved.slice(0, 10);
  const currentDate = new Date().toISOString().slice(0, 10);
  return daysBetween(mostRecentDate, currentDate) > 100 ? true : false;
}

function initDataForStock(ticker, parsedData) {
  state.quotes[ticker] = {};
  state.quotes[ticker]['data'] = parsedData;
}

function processDataForStock(ticker, parsedData) {
  try {
    // Mark pivot highs and lows.
    markAllPivots(state.quotes[ticker]['data'], ticker);
    buildHeatmap(ticker);

    // Scan each pivot for prior pivots in range, decreasing volume, absorption volume, etc.
    findHits(ticker, 'long', state.quotes[ticker]['pivotLows']);
    findHits(ticker, 'short', state.quotes[ticker]['pivotHighs']);

    // Build our buy/sell signal objects.
    buildSignals('long', state.quotes[ticker]['pivotLows'], ticker);
    buildSignals('short', state.quotes[ticker]['pivotHighs'], ticker);
  } 
  catch (e) {
    throw `${ticker} - Error processing data: ${e}`;
  }
}
