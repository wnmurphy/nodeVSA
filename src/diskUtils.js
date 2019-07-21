const fs = require('fs');
const folderPath = 'stockData';
const daysBetween = require('./daysBetween.js');


/**
  Initializes the local stock data folder if it doesn't yet exist.
*/
function initDataFolder() {
  if (!fs.existsSync(folderPath)){
    console.log(`${folderPath} folder doesn't exist. Creating...`);
    fs.mkdirSync(folderPath, (err) => {
      if (err) console.log(err);
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
    console.log(`Local data found for ${ticker}.`);
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
  
  initDataFolder();

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
      console.log(`${ticker} - ${filePath} doesn't exist. Creating...`);
      const stringifiedData = JSON.stringify(writeObject);
      fs.writeFileSync(filePath, stringifiedData);
      console.log(`${ticker} - Wrote data to disk.`);
      return incomingData;
    } catch (err) {
      console.log(`${ticker} - Error creating new file: `, err);
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
        console.log(`${ticker} - Got ${newData.length} entries. Applying partial update.`);
        writeObject.data = existingData.concat(newData);
      }
    }
    try {
      const stringifiedData = JSON.stringify(writeObject);
      console.log(`File for ${ticker} exists. Updating...`);
      fs.writeFileSync(filePath, stringifiedData);
      console.log(`${ticker} - Updated data on disk.`);
      return writeObject.data;
    } catch (err) {
      console.log(`${ticker} - Error updating existing data on disk: `, err);
    }    
  }
}


module.exports = {
  readStockDataFromDisk,
  writeStockDataToDisk,
}