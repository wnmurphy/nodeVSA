/**
  Calculates the percentage float turnover for a stock since a given date.
  Takes a ticker, a total float number, and a calculation start date.
  Accumulates the daily volume since the start date, returns the percentage of float
  turnover since that date.
  
  Example usage: node float GPRO 77930000 2017-01-04
*/
const log = console.log;
const rp = require('request-promise');
const config = require('./config.js')
const parseRawData = require('./src/parseRawData.js');


const ticker = process.argv[2];
const totalFloat = parseInt(process.argv[3]);
const startDate = process.argv[4];
const reverse = process.argv[5] === 'reverse' ? true : false;

const fetchDataForOneStock = (ticker) => new Promise((resolve, reject) => {
  log('Getting: ', '\x1b[34m', ticker, '\x1b[0m');
  return rp({ // Request data for this stock.
    uri: 'https://www.alphavantage.co/query',
    json: true,
    qs: {
      apikey: config.API_KEY,
      function: 'TIME_SERIES_DAILY',
      symbol: ticker,
      outputsize: 'full'
    },
    transform: parseRawData
  }).then(transformedData => {
    resolve(transformedData);
  });
});


const getFloatTurnovers = (volByDate, totalFloat, startDate, reverse) => {
  for (let i = 0; i < volByDate.length; i++) {
    // Iterate until we find the startDate, then start calculating turnover cycles.
    if (volByDate[i][0] === startDate) {
      const daysSubset = reverse ? volByDate.slice(0, i) : volByDate.slice(i);
      return calculateCycles(daysSubset, totalFloat, reverse);
    }
  }

  function calculateCycles(volByDate, totalFloat, reverse) {
    const turnoverDates = [];
    const results = {
      percentFloatRemaining: null,
      floatRemaining: null,
      turnovers: null,
      estimatedDaysRemaining: null,
      averageVolPerDay: null,
    };
    let remainingFloatInCycle = totalFloat;
    let cumulativeDailyVolume = 0;
    let daysConsidered = 0;
    if (reverse) {
      for (let j = volByDate.length - 1; j >= 0; j--) {
        remainingFloatInCycle = remainingFloatInCycle - volByDate[j][1];  
        // If we've found a turnover date, add to list and reset count.
        if (remainingFloatInCycle < 0) {
          turnoverDates.push(volByDate[j][0])
          remainingFloatInCycle += totalFloat;
        }
        // If this is the last day, return remaining float and list of turnover dates.
        if (j === 0) {
          results.floatRemaining = remainingFloatInCycle;
          results.turnovers = turnoverDates;
          results.percentFloatRemaining = (remainingFloatInCycle / totalFloat) * 100;
        }
      }
    } 
    else {
      for (let j = 0; j < volByDate.length; j++) {
        remainingFloatInCycle = remainingFloatInCycle - volByDate[j][1];  
        // Accumulate volume.
        cumulativeDailyVolume += volByDate[j][1];
        daysConsidered++;

        // If we've found a turnover date, add to list and reset count.
        if (remainingFloatInCycle < 0) {
          turnoverDates.push(volByDate[j][0])
          remainingFloatInCycle += totalFloat;
        }
        // If this is the last day, return remaining float and list of turnover dates.
        if (j === volByDate.length - 1) {
          results.floatRemaining = remainingFloatInCycle;
          results.turnovers = turnoverDates;
          results.percentFloatRemaining = (remainingFloatInCycle / totalFloat) * 100;
        }
      }
      results.averageVolPerDay = cumulativeDailyVolume / daysConsidered;
      results.estimatedDaysRemaining = results.floatRemaining / results.averageVolPerDay;
    }
    return results;
  }
};



fetchDataForOneStock(ticker)
  .then(transformedData => {
    const volumeByDate = transformedData.map(day => {
      return [day.date, day.v];
    });
    return volumeByDate;
  }).then(volumeByDate => {
    const result = getFloatTurnovers(volumeByDate, totalFloat, startDate, reverse);
    log(result);
  }).catch(e => console.log(`Error: ${e}`));