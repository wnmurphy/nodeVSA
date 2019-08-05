const config = require('../config.js')
const data = require('./stockData.js');
const log = require('./logger.js');
const parseRawData = require('./parseRawData.js');
const rp = require('request-promise');

// Returns a promise which fetches and parses data for one stock ticker.
const fetchDataForOneStock = (ticker, getAllData = false) => new Promise((resolve, reject) => {

  log('info', `${ticker} - Fetching data...`);

  const queryString = {
    apikey: config.API_KEY,
    function: 'TIME_SERIES_DAILY',
    symbol: ticker,
    outputsize: getAllData ? 'full' : 'compact', 
  };

  // Fetch data for this stock, parse, and return.
  return rp({ 
    uri: 'https://www.alphavantage.co/query',
    json: true,
    qs: queryString,
    transform: parseRawData
  })
  .then(parsedData => {
    log('info', `${ticker} - Retrieved ${parsedData.length} entries.`)
    resolve(parsedData);
  })
  .catch(e => { 
    log('warn', `${ticker} - Error fetching data: ${e}`, e.stack);
    // Add ticker to retry list.
    data.retries.push(ticker);
    reject(e);
  })
}); 

module.exports = fetchDataForOneStock;
