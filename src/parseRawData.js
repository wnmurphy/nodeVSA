const log = require('./logger.js');
// Takes a parsed JSON object, and transforms it.
// (Passed as the 'transform' option to request-promise.)
function parseRawData (stock) {
  try {
    const transformed = [];
    const timeSeries = stock['Time Series (Daily)'];
    const now = new Date();
    if (!timeSeries) {
      throw stock;
    }
    for (const date in timeSeries) {
      const dayOfData = {
        date,
        h: parseFloat(timeSeries[date]['2. high']),
        l: parseFloat(timeSeries[date]['3. low']),
        c: parseFloat(timeSeries[date]['4. close']),
        v: parseFloat(timeSeries[date]['5. volume']),
        pivotHigh: false,
        pivotLow: false,
        final: now > new Date(date) ? true : false, // TODO: refine this to after 1pm
      };
      transformed.push(dayOfData); 
    }
    // Reverse array so the most recent day is at last index.
    return transformed.reverse();
  }
  catch (error) {
    log('warn', `Transform error: ${error}`);
  }
}
module.exports = parseRawData;