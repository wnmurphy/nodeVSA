/**
  Calculates the percentage float turnover for a stock since a given date.
  Takes a ticker, a total float number, and a calculation start date.
  Accumulates the daily volume since the start date, returns the percentage of float
  turnover since that date.
  
  Example usage: node calculateFloatTurnover GPRO 77930000 2017-01-04
*/
const log = require('./src/logger.js');
const rp = require('request-promise');
const config = require('./config.js')
const parseRawData = require('./src/parseRawData.js');
const fetchDataForOneStock = require('./src/fetchDataForOneStock.js');

const ticker = process.argv[2];
const totalFloat = parseInt(process.argv[3]);
const startDate = process.argv[4];
const reverse = process.argv[5] === 'reverse' ? true : false;

const getFloatTurnovers = (volByDate, totalFloat, startDate, reverse) => {
  for (let i = 0; i < volByDate.length; i++) {
    // Iterate until we find the startDate, then start calculating turnover cycles.
    if (volByDate[i][0] === startDate) {
      const daysSubset = reverse ? volByDate.slice(0, i) : volByDate.slice(i);
      return calculateCycles(daysSubset, totalFloat, reverse);
    }
  }
};

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
      const todaysDate = volByDate[j][0];
      const todaysVolume = volByDate[j][1];
      remainingFloatInCycle = remainingFloatInCycle - todaysVolume;  
      // If we've found a turnover date, add to list and reset count.
      if (remainingFloatInCycle < 0) {
        turnoverDates.push(todaysDate)
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
      const todaysDate = volByDate[j][0];
      const todaysVolume = volByDate[j][1];
      remainingFloatInCycle = remainingFloatInCycle - todaysVolume;  
      // Accumulate volume.
      cumulativeDailyVolume += todaysVolume;
      daysConsidered++;

      // If we've found a turnover date, add to list and reset count.
      if (remainingFloatInCycle < 0) {
        turnoverDates.push(todaysDate)
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
};


fetchDataForOneStock(ticker, true)
  .then(transformedData => {
    const volumeByDate = transformedData.map(day => {
      return [day.date, day.v];
    });
    return volumeByDate;
  })
  .then(volumeByDate => {
    const result = getFloatTurnovers(volumeByDate, totalFloat, startDate, reverse);
    log('info', JSON.stringify(result));
  })
  .catch(e => log('warn', e, e.stack));
