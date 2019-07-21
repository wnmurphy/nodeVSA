const data = require('./stockData.js');

// Take an array, days, and the ticker symbol as a string.
function markAllPivots(days, ticker) {
  const LOOKBACK = 14;

  // Init storage arrays for pivots if undefined.
  data.quotes[ticker]['pivotHighs'] = data.quotes[ticker]['pivotHighs'] || [];
  data.quotes[ticker]['pivotLows'] = data.quotes[ticker]['pivotLows'] || [];

  // Calculate a 14-day volume moving average for each day.
  for (let i = LOOKBACK; i < days.length; i++) {
    const lastXDays = days.slice(i - LOOKBACK, i);
    const totalLookbackVolume = lastXDays.map(day => day.v).reduce((a, b) => { 
      return a + b; 
    })
    const averageVolume = totalLookbackVolume / LOOKBACK;
    // console.log(averageVolume);
    days[i].averageVol = parseInt(averageVolume);
  }

  // Mark pivot highs.
  for (let i = 1; i < days.length; i++) {
    // Mark most recent day as pivot high.
    if (days[i + 1] === undefined) {
      if (days[i].h > days[i - 1].h) {
        days[i].pivotHigh = true;
        // Copy next day close for analysis
        days[i].tomorrowClose = 'N/A';
        data.quotes[ticker]['pivotHighs'].push(days[i]);
      }
    } 
    else { 
      // Mark all days with a pivot high and add to storage array.
      if (days[i].h > days[i - 1].h && days[i].h > days[i + 1].h) {
        days[i].pivotHigh = true;
        // Copy next day close for analysis
        days[i].tomorrowClose = days[i + 1].c;
        data.quotes[ticker]['pivotHighs'].push(days[i]);
      }
    }
  }

  // Mark pivot lows.
  for (let i = 1; i < days.length; i++) {
    // Mark most recent day as pivot low.
    if (days[i + 1] === undefined) { 
      if (days[i].l < days[i - 1].l) {
        days[i].pivotLow = true;
        // Copy next day close for analysis
        days[i].tomorrowClose = 'N/A';
        data.quotes[ticker]['pivotLows'].push(days[i]);
      }
    } 
    else {
      // Mark all days with a pivot high and add to storage array.
      if (days[i].l < days[i - 1].l && days[i].l < days[i + 1].l) { 
        days[i].pivotLow = true;
        // Copy next day close for analysis
        days[i].tomorrowClose = days[i + 1].c;
        data.quotes[ticker]['pivotLows'].push(days[i]);
      }
    }
  }
}

module.exports = markAllPivots;
