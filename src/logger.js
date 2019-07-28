const fs = require('fs');
const config = require('../config.js');
const folderPath = 'logs';
let logFolderExists = false;


const logger = (level,  message, extra) => {
  // Filter out any logging levels not set in config file.
  if (!config.logLevels.includes(level)) {
    return;
  }
  // Create the log files folder if it doesn't exist.
  initLogFolder(folderPath);

  // Format the message.
  const output = format(level, message, extra);
  // Write to screen.
  console.log(output);
  // Write to file.
  const date = new Date().toISOString().slice(0, 10);
  const fileName = `${date}.txt`;
  const filePath = `${folderPath}/${fileName}`;
  // Create a file with today's date if it doesn't exist.
  if (!fs.existsSync(filePath)) {
    console.log(`${filePath} doesn't exist. Creating...`);
    fs.writeFileSync(filePath, '', 'utf8');
  }
  fs.appendFile(filePath, output, (err) => {
    if (err) {
      console.error(err);
    }
  });
};


// Creates the folder at folderPath if it doesn't yet exist.
function initLogFolder(path) {
  if (logFolderExists) {
    return;
  }
  if (!fs.existsSync(path)) {
    console.log(`Logs folder doesn't exist. Creating...`);
    fs.mkdirSync(path, (err) => {
      if (err) {
        return console.error(err);
      };
    });
    logFolderExists = true;
  }
}


// Handles formatting for log messages.
function format(level, message, extra) {
  const now = new Date().toISOString();
  let formattedOutput = `${now}::${level.toUpperCase()}::${message}\n`;
  if (extra !== undefined) {
    formattedOutput += `${extra}\n`;
  }
  return formattedOutput;
};


module.exports = logger;
