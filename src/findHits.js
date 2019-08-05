const daysBetween = require('./daysBetween.js');
const state = require('./stockData.js');
const log = require('./logger.js');

// A 'hit' is a pivot near the same price range as the current pivot.
// Finds and stores all prior hits, recent hits, and recent hits on decreasing volume.
// Scans an array of pivots for a single ticker.
function findHits(ticker, direction, pivots) {
  if (!['long', 'short'].includes(direction)) {
    return log('warn', 'Must specify "long" or "short".');
  }
  const pivot = direction === 'long' ? 'l' : 'h';

  // Calculate average volume over last 14 days. Used to detect absorption volume.
  const avgVolume = state.quotes[ticker].data.map(day => day.v).reduce((a, b) => { return a + b;
  }) / state.quotes[ticker].data.length;

  // For each day of pivot data in state.quotes[ticker][pivotArr]
  for (const [currentPivotIdx, currentPivot] of pivots.entries()) {

    // Init values.
    currentPivot.priorHits = [];
    currentPivot.priorHitsCount = 0;
    currentPivot.recentHits = [];
    currentPivot.recentHitsCount = 0;
    currentPivot.recentHitsOnGreaterVolume = [];
    currentPivot.recentHitsOnGreaterVolumeCount = 0;
    currentPivot.absorptionVolume = false;
    currentPivot.allRecentHitsDecreasing = null;
    currentPivot.belowAvgVol = false;
    currentPivot.outerPivotOnLowerVolume = false;
    currentPivot.date = currentPivot.date.split(' ')[0]; // Removes the random timestamp.

    // Calculate hit threshold.
    const threshold = 0.003;
    const p = currentPivot[pivot];
    const range = [
      p - (p * threshold),
      p + (p * threshold),
    ];


    // Lookback period to find each pivot's recent prior hits.
    const dayRange = 100; 


    // Get prior pivots j within range of current pivot i.
    for (let j = 0; j < currentPivotIdx; j++) {
      if (
        (pivots[j][pivot] >= range[0]) &&
        (pivots[j][pivot] <= range[1])
      ) {
        // Store array with pivot.
        currentPivot.priorHits.push(pivots[j]);
        currentPivot.priorHitsCount = currentPivot.priorHits.length;
      }
    }

    // Get prior pivots k within day range of current pivot i.
    for (const priorHit of currentPivot.priorHits) {
      // Capture more recent hits.
      // Removes dash from dates, then compares difference to check if within range.
      if (daysBetween(priorHit['date'], currentPivot['date']) < dayRange) {
        currentPivot.recentHits.push(priorHit);
        currentPivot.recentHitsCount = currentPivot.recentHits.length;
      }
    }

    // Get all recent hits that have more volume than current pivot.
    for (const recentHit of currentPivot.recentHits) {
      // If the volume is Decreasing on any of the prior recent pivots, add to recentHitsOnGreaterVolume.
      if (recentHit['v'] > currentPivot['v']) {
        currentPivot.recentHitsOnGreaterVolume.push(recentHit);
        currentPivot.recentHitsOnGreaterVolumeCount = currentPivot.recentHitsOnGreaterVolume.length;
      }
    }

    // Determine if any recent hit shows absorption volume.
    for (const recentHitWithGreaterVol of currentPivot.recentHitsOnGreaterVolume) {
      // If any of the recent hits have volume greater than X times the average, mark true.
      if (recentHitWithGreaterVol['v'] > currentPivot['averageVol'] * 1.2) {
        currentPivot.absorptionVolume = true;
      }
    }

    
    // Determine if all recent hits are decreasing in volume.
      // Handle when there's more than one recent hit.
    if (currentPivot.recentHitsOnGreaterVolume.length > 1) {
      let allDecreasingSoFar = true;
      // Set flag if all recentHitsOnGreaterVolume are decreasing.
      for (let n = 1; n < currentPivot.recentHitsOnGreaterVolume.length; n++) {
        if (!(currentPivot.recentHitsOnGreaterVolume[n]['v'] <= currentPivot.recentHitsOnGreaterVolume[n - 1]['v'] &&
            currentPivot.recentHitsOnGreaterVolume[n]['v'] > currentPivot['v'])
          ) {
          allDecreasingSoFar = false;
        }
      }
      currentPivot.allRecentHitsDecreasing = allDecreasingSoFar;
      // Handle when there's exactly one recent hit.
    } else if (currentPivot.recentHitsOnGreaterVolume.length === 1) {
      let allDecreasingSoFar = true;
      if (!(currentPivot.recentHitsOnGreaterVolume[0]['v'] > currentPivot['v'])) {
        allDecreasingSoFar = false;
      }
      currentPivot.allRecentHitsDecreasing = allDecreasingSoFar;
    }


    // Determine if this current pivot has below average volume.
    if (currentPivot['v'] < currentPivot['averageVol']) {
      currentPivot.belowAvgVol = true;
    }

    // Determine if current pivot is an outer pivot on lower volume.
    const len = currentPivot.recentHits.length;
    if (len) {
      // console.log('current pivot:', currentPivot);
      // console.log('prior pivot:', currentPivot.recentHits[len - 1]);
      if (direction === 'long') {
        if ( (currentPivot['l'] < currentPivot.recentHits[len - 1]['l']) && 
             (currentPivot['v'] < currentPivot.recentHits[len - 1]['v'])
          ) {
          // console.log('this pivot:', currentPivot['date']);
          // console.log('current low:', currentPivot['l']);
          // console.log('current volume:', currentPivot['v']);
          // console.log('most recent pivot:', currentPivot.recentHits[len - 1]['date']);
          // console.log('most recent pivot's volume:', currentPivot.recentHits[len - 1]['v']);
          // console.log('most recent pivot's low:', currentPivot.recentHits[len - 1]['l']);
          currentPivot.outerPivotOnLowerVolume = true;
          currentPivot.outerPivotOnLowerVolumeDate = currentPivot.recentHits[len - 1]['date'];
        }
      } else if (direction === 'short') {
        if ( (currentPivot['h'] > currentPivot.recentHits[len - 1]['h']) && 
             (currentPivot['v'] < currentPivot.recentHits[len - 1]['v'])
          ) {
          // console.log('this pivot:', currentPivot['date']);
          // console.log('current high:', currentPivot['h']);
          // console.log('current volume:', currentPivot['v']);
          // console.log('most recent pivot:', currentPivot.recentHits[len - 1]['date']);
          // console.log('most recent pivot's volume:', currentPivot.recentHits[len - 1]['v']);
          // console.log('most recent pivot's high:', currentPivot.recentHits[len - 1]['h']);
          currentPivot.outerPivotOnLowerVolume = true;
          currentPivot.outerPivotOnLowerVolumeDate = currentPivot.recentHits[len - 1]['date'];
        }
      }
    }

    // console.log(currentPivot);
  }
}

module.exports = findHits;
