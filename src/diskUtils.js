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
  Throws error if the file doesn't exist.
*/
function readStockDataFromDisk(ticker) {
  const filePath = `${folderPath}/${ticker}.json`;
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    log('info', `${ticker} - Local data found.`);
    return JSON.parse(data);
  }
  catch (err) {
    throw err;
  }
}

/**
  Takes a ticker string, a serialized stock data object, and an optional existingData object.
  Writes the stock data to a local data file for that ticker if it doesn't exist.
  If the local data file already exists, appends existingData.
  Returns either the new data, or the new + existing data.
*/
function writeStockDataToDisk(ticker, incomingData, existingData) {
  
  initDataFolder(folderPath);

  const filePath = `${folderPath}/${ticker}.json`;
  const now = new Date();
  const writeObject = {
    data: incomingData,
    lastDateRetrieved: incomingData[incomingData.length - 1].date,
    lastUpdated: now.toISOString(),
  };

  // If we're creating the file for the first time.
  if (!fs.existsSync(filePath)) {
    try {
      log('info', `${ticker} - ${filePath} doesn't exist. Creating...`);
      const stringifiedData = JSON.stringify(writeObject);
      fs.writeFileSync(filePath, stringifiedData);
      log('info', `${ticker} - Wrote data to disk.`);
      return incomingData;
    } catch (e) {
      log('warn', `${ticker} - Error creating new file: ${e}`, e.stack);
    }
  } 
  // Otherwise, we're appending data to existing file.
  else {
    // If we have a partial update, append only the newest day entries.
    // Otherwise, we can just overwrite existingData with incomingData, which has already been set.
    if (incomingData.length < existingData.length) {
      const lastDateRetrievedForExistingData = existingData[existingData.length - 1].date.slice(0, 10);
      const sliceAfterIdx = incomingData.findIndex(day => day.date === lastDateRetrievedForExistingData);
      if (sliceAfterIdx > 0) {
        const newData = incomingData.slice(sliceAfterIdx + 1);
        log('info', `${ticker} - Got ${newData.length} new entries not in local data. Applying partial update.`);
        writeObject.data = existingData.concat(newData);
      }
    }
    try {
      const stringifiedData = JSON.stringify(writeObject);
      log('info', `${ticker} - Updating local data file...`);
      fs.writeFileSync(filePath, stringifiedData);
      log('info', `${ticker} - Updated data on disk.`);
      return writeObject.data;
    } catch (e) {
      log('warn', `${ticker} - Error updating existing data on disk: ${e}`, e.stack);
    }    
  }
}


module.exports = {
  readStockDataFromDisk,
  writeStockDataToDisk,
}