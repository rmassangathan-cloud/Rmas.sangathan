require('dotenv').config();
const fs = require('fs');
const path = process.env.PUPPETEER_EXECUTABLE_PATH;
console.log('ENV PUPPETEER_EXECUTABLE_PATH ->', JSON.stringify(path));
if (path) {
  const p = path.replace(/^"(.*)"$/, '$1');
  console.log('Sanitized ->', p);
  console.log('Exists?', fs.existsSync(p));
}
const candidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe'
];
candidates.forEach(p => console.log(p, 'exists?', fs.existsSync(p)));
