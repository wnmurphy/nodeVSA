const config = require('../config.js')
const rp = require('request-promise');
const parseRawData = require('./parseRawData.js');
const markAllPivots = require('./markAllPivots.js');
const buildHeatmap = require('./buildHeatMap');
const findHits = require('./findHits.js');
const buildSignals = require('./buildSignals.js');
const daysBetween = require('./daysBetween.js');
const log = require('./logger.js');
const data = require('./stockData.js');
const diskUtils = require('./diskUtils');

// Requests data for one stock ticker with a promise.
const fetchDataForOneStock = (ticker) => new Promise((resolve, reject) => {
  
  log('info', `Getting: \x1b[34m'${ticker}\x1b[0m`);
  const queryString = {
    apikey: config.API_KEY,
    function: 'TIME_SERIES_DAILY',
    symbol: ticker,
    outputsize: 'compact', 
  };

  let localFile;
  try {
    localFile = diskUtils.readStockDataFromDisk(ticker);
    // Since we can only retrieve either 100 days of data, or 20 years of data, 
    // if it's been more than 100 days since last retrieval we'll need all of it.
    const mostRecentDate = localFile.lastDateRetrieved.slice(0, 10);
    const currentDate = new Date().toISOString().slice(0, 10);
    if (daysBetween(mostRecentDate, currentDate) > 100) {
      queryString.outputsize = 'full'; 
    }
  } catch (e) {
    // If we have no local data for this ticker, retrieve complete history.
    if (e.code === 'ENOENT') {
      log('info', `${ticker} - No local data.`);
      queryString.outputsize = 'full'; 
    }
    else {
      log('warn', `${ticker} - Error reading data from disk: ${e}`);
    }
  }

  // Fetch data for this stock.
  rp({ 
    uri: 'https://www.alphavantage.co/query',
    json: true,
    qs: queryString,
    transform: parseRawData
  })
  .then(parsedData => {
    log('info', `Got: \x1b[34m${ticker}\x1b[0m`);
    log('info', `${ticker} - Retrieved ${parsedData.length} entries.`)
    // Append to data stored locally.
    const localData = localFile ? localFile.data : null;
    parsedData = diskUtils.writeStockDataToDisk(ticker, parsedData, localData);

    // Store clean data for this stock for processing.
    data.quotes[ticker] = {};
    data.quotes[ticker]['data'] = parsedData;

    // Mark pivot highs and lows.
    markAllPivots(data.quotes[ticker]['data'], ticker);
    buildHeatmap(ticker);

    // Scan each pivot for prior pivots in range, decreasing volume, absorption volume, etc.
    findHits(ticker, 'long', data.quotes[ticker]['pivotLows']);
    findHits(ticker, 'short', data.quotes[ticker]['pivotHighs']);
  
    // Build our buy/sell signal objects.
    buildSignals('long', data.quotes[ticker]['pivotLows'], ticker);
    buildSignals('short', data.quotes[ticker]['pivotHighs'], ticker);

    resolve();
  })
  .catch(err => { 
    // Tell user if something went wrong.
    log('warn', `\n\x1b[31mTicker: ${ticker}\nError: \x1b[0m\n${err}`);
    // Add ticker to retry list.
    data.retries.push(ticker);
    reject(err);
  })
}); 

module.exports = fetchDataForOneStock;
