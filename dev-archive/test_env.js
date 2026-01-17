require('dotenv').config();

console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);
console.log('All env vars:', Object.keys(process.env).filter(key => key.startsWith('PUPPETEER') || key.includes('EXECUTABLE')));
