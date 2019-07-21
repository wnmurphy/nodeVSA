const config = require('../config.js')
const rp = require('request-promise');
const parseRawData = require('./parseRawData.js');
const markAllPivots = require('./markAllPivots.js');
const buildHeatmap = require('./buildHeatMap');
const findHits = require('./findHits.js');
const buildSignals = require('./buildSignals.js');
const log = console.log;
const data = require('./stockData.js');
const diskUtils = require('./diskUtils');

// Requests data for one stock ticker with a promise.
const fetchDataForOneStock = (ticker) => new Promise((resolve, reject) => {
  
  log('Getting: ', '\x1b[34m', ticker, '\x1b[0m');
  let diskData;
  const queryString = {
    apikey: config.API_KEY,
    function: 'TIME_SERIES_DAILY',
    symbol: ticker,
    outputsize: 'compact',
  };

  try {
    diskData = diskUtils.readStockDataFromDisk(ticker).data;
  } catch (e) {
    // If we have no data for this ticker, retrieve complete history.
    if (e.code === 'ENOENT') {
      log(`No local data for ${ticker}.`);
      queryString.outputsize = 'full'; 
    }
    else {
      log(`Error reading ${ticker} data from disk: `, e);
    }
  }

  rp({ // Request data for this stock.
    uri: 'https://www.alphavantage.co/query',
    json: true,
    qs: queryString,
    transform: parseRawData
  })
  .then(parsedData => {
    console.log(`Retrieved ${parsedData.length} entries for ${ticker}.`)
    // Append to data stored locally.
    diskData = diskUtils.writeStockDataToDisk(ticker, parsedData, diskData);

    // Store clean data for this stock for processing.
    data.quotes[ticker] = {};
    data.quotes[ticker]['data'] = diskData;

    // Mark pivot highs and lows.
    markAllPivots(data.quotes[ticker]['data'], ticker);
    buildHeatmap(ticker);

    // Scan each pivot for prior pivots in range, decreasing volume, absorption volume, etc.
    findHits(ticker, 'long', data.quotes[ticker]['pivotLows']);
    findHits(ticker, 'short', data.quotes[ticker]['pivotHighs']);
  
    // Build our buy/sell signal objects.
    buildSignals('long', data.quotes[ticker]['pivotLows'], ticker);
    buildSignals('short', data.quotes[ticker]['pivotHighs'], ticker);
    
    log('Got: ', '\x1b[34m', ticker, '\x1b[0m');

    resolve();
  })
  .catch(err => { 
    // Tell user if something went wrong.
    log('\n' + '\x1b[31m' + 'Ticker: ' + ticker + '\n' + 'Error: ' + '\x1b[0m' + '\n' + err);
    // Add ticker to retry list.
    data.retries.push(ticker);
    reject(err);
  })
}); 

module.exports = fetchDataForOneStock;
