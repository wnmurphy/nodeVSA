// Searches through all loaded signals by ticker, date, or trade direction.
  // Should be run once we've finished retrieiving all data from server.
  // Example search filters:
  // "signal.date === '2017-07-07'"
  // "signal.symbol === 'AAPL' && signal.trade === 'long'"

const state = require('./stockData.js');

function filterResults(filter) {
  let results;

  // Get search results.
  if(filter) { 
    results = state.allSignals.filter(function(signal){
      return eval(filter);
    });
  }
  // Return results..
  return results || [];
};

module.exports = filterResults;


