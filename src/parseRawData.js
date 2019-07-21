// Takes a parsed JSON object, and transforms it.
// (Passed as the 'transform' option to request-promise.)
function parseRawData (stock) {
  try {
    const transformed = [];
    const timeSeries = stock['Time Series (Daily)'];
    if (!timeSeries) {
      throw stock;
    }
    for (const date in timeSeries) {
      const dayOfData = {};
      dayOfData.date = date;
      dayOfData.h = parseFloat(timeSeries[date]['2. high']);
      dayOfData.l = parseFloat(timeSeries[date]['3. low']);
      dayOfData.c = parseFloat(timeSeries[date]['4. close']);
      dayOfData.v = parseFloat(timeSeries[date]['5. volume']);
      dayOfData.pivotHigh = false;
      dayOfData.pivotLow = false;
      transformed.push(dayOfData); 
    }
    // Reverse array so the most recent day is at last index.
    return transformed.reverse();
  }
  catch (error) {
    console.log('Transform error. Got:');
    console.log(error);
  }
}
module.exports = parseRawData;