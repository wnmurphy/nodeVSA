const fs = require('fs');
const folderPath = 'stockData';


function initDataFolder() {
  if (!fs.existsSync(folderPath)){
    console.log(`${folderPath} folder doesn't exist. Creating...`);
    fs.mkdirSync(folderPath, (err) => {
      if (err) console.log(err);
    });
  }
}


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


function writeStockDataToDisk(ticker, data, existingData) {
  
  initDataFolder();

  const filePath = `${folderPath}/${ticker}.json`;
  const now = new Date();
  const writeObject = {
    data,
    mostRecentDateRetrieved: data[data.length - 1].date,
    lastUpdated: now.toISOString(),
  };

  // If we're creating the file for the first time.
  if (!fs.existsSync(filePath)) {
    const stringifiedData = JSON.stringify(writeObject);
    console.log(`${filePath} doesn't exist. Creating...`);
    try {
      fs.writeFileSync(filePath, stringifiedData);
      console.log(`Wrote data to disk for ${ticker}`);
      return data;
    } catch (err) {
      console.log(`Error creating new file for ${ticker}: `, err);
    }
  } 
  // Otherwise, we're appending data to existing file.
  else {
    const updatedData = existingData.concat(data);
    writeObject.data = updatedData;
    const stringifiedData = JSON.stringify(writeObject);
    console.log(`File for ${ticker} exists. Updating...`);
    try {
      fs.writeFileSync(filePath, stringifiedData);
      console.log(`Updated data on disk for ${ticker}`);
      return updatedData;
    } catch (err) {
      console.log(`Error updating existing data for ${ticker}: `, err);
    }    
  }
}


module.exports = {
  readStockDataFromDisk,
  writeStockDataToDisk,
}