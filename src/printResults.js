const log = console.log;

function printResults (results) {

  function pad (toPad, len) {
    let input = String(toPad);
    while (input.length < len) {
      input += ' ';
    }
    return input;
  }
  
  log(
    'symbol | ' + 
    'date | ' + 
    'trade | ' + 
    'aph | ' + 
    'rh | ' + 
    'rhogv | ' + 
    'av | ' +
    'rhad | ' +
    'bav | ' +
    'oplv | ' + 
    'oplvDate: '
  );

  let long = 0, short = 0, weightedLong = 0, weightedShort = 0;

  for (const result of results) {
    log(
      `${pad(result.symbol, 6)} | ` +
      `${result.date} | ` +
      `${pad(result.trade, 6)} | ` +
      `${result.priorHitsCount} | ` +
      `${result.recentHitsCount} | ` +
      `${result.recentHitsOnGreaterVolumeCount} | ` +
      `${result.absorptionVolume} | ` +
      `${result.allRecentHitsDecreasing} | ` +
      `${result.belowAvgVol} | ` +
      `${result.outerPivotOnLowerVolume} | ` + 
      `${result.outerPivotOnLowerVolumeDate}`
    );
    
    if (result.trade === 'long') {
      weightedLong += result.recentHitsOnGreaterVolumeCount;
      long++;
    }

    if (result.trade === 'short'){ 
      weightedShort += result.recentHitsOnGreaterVolumeCount;
      short++; 
    }
  }
  log('Long/Short Ratio:', long/short);
  log('Weighted ratio:', weightedLong/weightedShort);
  log('Weighted long:', weightedLong);
  log('Weighted short:', weightedShort);
  log('Long:', long);
  log('Short:', short);
}

module.exports = printResults;
