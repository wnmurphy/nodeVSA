const fs = require('fs');
const log = require('./logger.js');
const data = require('./stockData.js');

function writeCSV (signalsArray) {
  // Create new file, overwrite existing old results.
  fs.writeFileSync('results.csv', '', 'utf8');
  fs.appendFileSync('results.csv', 'symbol,date,trade,priorHits,recentHits,recentHitsOnGreaterVolume,absorptionVolume,allRecentHitsDecreasing,belowAvgVol,opolv,close,nextClose\n', 'utf8');
  for (const signal of signalsArray) {
    const line = [ 
      signal['symbol'],
      signal['date'],
      signal['trade'],
      signal['priorHitsCount'],
      signal['recentHitsCount'],
      signal['recentHitsOnGreaterVolumeCount'],
      signal['absorptionVolume'],
      signal['allRecentHitsDecreasing'],
      signal['belowAvgVol'],
      signal['outerPivotOnLowerVolume'],
      signal['outerPivotOnLowerVolumeDate'],
      signal['data']['c'],
      signal['data']['tomorrowClose']
    ].join(',')
    fs.appendFile('results.csv', line + '\n', 'utf8', (err) => {
      if (err) throw err;
    });
  }

  log('info', 'CSV results written to disk.'); 
}

module.exports = writeCSV;
