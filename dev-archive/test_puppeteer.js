require('dotenv').config();

const puppeteer = require('puppeteer');

async function testLaunch() {
    console.log('PUPPETEER_EXECUTABLE_PATH:', process.env.PUPPETEER_EXECUTABLE_PATH);

    try {
        const browser = await puppeteer.launch({
            headless: 'new',
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--single-process',
                '--no-zygote'
            ]
        });

        console.log('Browser launched successfully');
        await browser.close();
    } catch (err) {
        console.error('Failed to launch browser:', err.message);
    }
}

testLaunch();
