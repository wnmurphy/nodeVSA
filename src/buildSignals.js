const state = require("./stockData.js");

/**
  A signal is an object that contains information about a pivot. 
  Builds our signal objects, so we can later search through them.
*/

function buildSignals (direction, pivotsArr, ticker) {
  state.allSignals = state.allSignals || [];

  for (const pivot of pivotsArr) {
    if (pivot.priorHitsCount && pivot.priorHitsCount > 0) {
      // Build and store a new signal object.
      let currentSignal = {
        date: pivot.date.split(' ')[0], // Removes the random timestamp.
        symbol: ticker,
        trade: direction,
        priorHits: pivot.priorHits,
        priorHitsCount: pivot.priorHitsCount,
        recentHits: pivot.recentHits,
        recentHitsCount: pivot.recentHitsCount,
        recentHitsOnGreaterVolumeCount: pivot.recentHitsOnGreaterVolumeCount,
        absorptionVolume: pivot.absorptionVolume,
        allRecentHitsDecreasing: pivot.allRecentHitsDecreasing,
        belowAvgVol: pivot.belowAvgVol,
        data: pivot,
        outerPivotOnLowerVolume: pivot.outerPivotOnLowerVolume,
        outerPivotOnLowerVolumeDate: pivot.outerPivotOnLowerVolumeDate,
        tomorrowClose: pivot.tomorrowClose
      };
      state.allSignals.push(currentSignal);
    }
  }
}

module.exports = buildSignals;
