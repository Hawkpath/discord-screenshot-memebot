const path = require('path');
const puppeteer = require('puppeteer');

const RUN_HEADLESS = true;
const REDIRECT_PUPPETEER_CONSOLE = false;
const DEBUG_SCREENSHOT = false;
const JPEG_QUALITY = 75;

async function generateScreenshot(messageData) {
    const browser = await puppeteer.launch({ headless: RUN_HEADLESS });
    const page = await browser.newPage();
    page.setViewport({
        width: 1920,
        height: 1080,
        // I'm not sure how to dynamically set this... it's set according to my
        // 150% scaling in Windows
        deviceScaleFactor: 1.5
    });

    // Redirect console output for testing
    if (REDIRECT_PUPPETEER_CONSOLE) {
        page
            .on('console', message =>
                console.log(`<${message.type().substr(0, 3).toUpperCase()}> ${message.text()}`))
            .on('pageerror', ({ message }) => console.log(message))
            // .on('response', response =>
            //     console.log(`${response.status()} ${response.url()}`))
            .on('requestfailed', request =>
                console.log(`${request.failure().errorText} ${request.url()}`));
    }

    try {
        await page.goto(
            `file:${path.join(__dirname, 'src', 'index.html')}`,
            {waitUntil: 'networkidle0'}
        );

        // Enter document context and add message data
        await page.evaluate((messageData) => {
            addMessages(messageData);
            window.scrollBy(0, window.innerHeight);
        }, messageData);

        await page.waitForTimeout(100);  // hacky but it lets the images load?

        const body = await page.$('body');
        if (DEBUG_SCREENSHOT) {
            await body.screenshot({
                path: 'tmp.jpg',
                type: 'jpeg',
                quality: JPEG_QUALITY
            });
        } else {
            // Write base64 image representation of body to stdout
            let screenshot = await body.screenshot({
                encoding: 'base64',
                type: 'jpeg',
                quality: JPEG_QUALITY,  // only applies to jpegs
                omitBackground: false,
            });
            console.log(screenshot);
        }
    } catch (e) {
        console.error(e);
    }

    if (RUN_HEADLESS)
        await browser.close();
}

let messageData = process.argv[2];
if (messageData) {
    messageData = JSON.parse(messageData);
    generateScreenshot(messageData);
}
