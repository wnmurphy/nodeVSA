const rp = require('request-promise');
const createThrottle = require('./src/createThrottle.js')
const throttle = createThrottle(1, 4000);
const tickers = require('./stockList.js');
const fs = require('fs');
const log = require('./src/logger.js');

// Retreives financial data from Yahoo Finance, scrapes the float for a ticker, and returns it as a tuple.
const scrapeFloat = (ticker) => new Promise((resolve, reject) => {
  log('info', `${ticker} - Scraping float data...`);
  return rp({ 
    uri: `https://finance.yahoo.com/quote/${ticker}/key-statistics/`,
    json: true,
  })
  .then(response => {
    const searchTerm = 'floatShares":{"raw":';
    const floatIdx = response.indexOf(searchTerm);
    if (floatIdx < 0) {
      log('info', `Search term ${searchTerm} not found in response.`)
    }
    const startIdx = floatIdx + searchTerm.length;
    const endIdx = startIdx + 20;
    const snippet = response.slice(startIdx, endIdx);
    const snippetArr = snippet.split(',');
    const float = snippetArr[0];
    log('info', `${ticker} - Got float: ${float}`)
    resolve([ticker, parseInt(float)]);
  })
  .catch(e => { 
    log('warn', `${ticker} - Error scraping float: ${e}`, e.stack);
  })
}); 

const getAllFloats = (tickers) => {
  const floatRequests = tickers.map(ticker => {
    return throttle().then(() => {
      return scrapeFloat(ticker);
    })
  });
  return Promise.all(floatRequests).then(results => {
      const floatMap = {};
      for (const floatEntry of results) {
        floatMap[floatEntry[0]] = floatEntry[1];
      }
      log('info', `floatMap: ${JSON.stringify(floatMap)}`);
      return floatMap;
    })
    .catch(e => log('warn', `Error during retrieval of all floats: ${e}`, e.stack));
};

async function main() {
  try {
    const floats = await getAllFloats(tickers);
    const fileObj = {
      lastUpdated: new Date().toISOString(),
      floats,
    };
    const stringifiedData = JSON.stringify(fileObj);
    fs.writeFileSync('./floats.json', stringifiedData);
  } catch (e) {
    log('warn', e, e.stack);
  }
}

main();

// return scrapeFloat("TSLA")

module.exports = scrapeFloat;
