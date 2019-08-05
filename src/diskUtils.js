const fs = require('fs');
const folderPath = 'stockData';
const daysBetween = require('./daysBetween.js');
const log = require('./logger.js');


/**
  Initializes the local stock data folder if it doesn't yet exist.
*/
function initDataFolder(path) {
  if (!fs.existsSync(path)) {
    log('info', `${path} folder doesn't exist. Creating...`);
    fs.mkdirSync(path, (err) => {
      if (err) {
        log('warn', err, e.stack);
      };
    });
  }
}


/**
  Takes a ticker string, reads a JSON file from disk with that ticker as the filename.
  Returns empty object if the file doesn't exist, or parsed JSON file.
*/
function readStockDataFromDisk(ticker) {
  const filePath = `${folderPath}/${ticker}.json`;
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    log('info', `${ticker} - Local data found.`);
    return JSON.parse(data);
  }
  catch (e) {
    if (e.code === 'ENOENT') {
      log('info', `${ticker} - No local data stored.`);
      return {};
    }
    throw `${ticker} - Error reading data from disk: ${e}`;
  }
}


/**
  Takes a ticker string, and a serialized object of parsed stock data.
  Initializes local data folder if it doesn't exist.
  Creates a JSON file with ticker as the file name if it doesn't exist, then Writes parsed data to that file.
  Overwrites data if file exists.
*/
function writeStockDataToDisk(ticker, parsedData) {
  
  initDataFolder(folderPath);

  const filePath = `${folderPath}/${ticker}.json`;
  const now = new Date();
  const writeObject = {
    data: parsedData,
    lastDateRetrieved: parsedData[parsedData.length - 1].date,
    lastUpdated: now.toISOString(),
  };

  try {
    const stringifiedData = JSON.stringify(writeObject);
    fs.writeFileSync(filePath, stringifiedData);
    log('info', `${ticker} - Wrote data to disk.`);
    return;
  } 
  catch (e) {
    throw `${ticker} - Error writing data to disk: ${e}`;
  }
}


/**
  Takes an new parsed data file, and existing parsed data file.
  Looks for last date of existing data in incoming data, crops just the new entries not already present in existing data, appends them to existing data, and returns existing data.
*/
function mergeNewAndExistingData(ticker, incomingData, existingData) {
  initDataFolder(folderPath);
  const lastDateRetrievedForExistingData = existingData[existingData.length - 1].date.slice(0, 10);
  const sliceAfterIdx = incomingData.findIndex(day => day.date === lastDateRetrievedForExistingData);
  console.log(sliceAfterIdx);
  if (sliceAfterIdx > 0) {
    const newData = incomingData.slice(sliceAfterIdx + 1);
    log('info', `${ticker} - Found ${newData.length} entries not in local data. Merging...`);
    return existingData.concat(newData);
  }
  throw `Last date of existing data not found in incoming data update.`;
}


module.exports = {
  readStockDataFromDisk,
  writeStockDataToDisk,
  mergeNewAndExistingData,
}