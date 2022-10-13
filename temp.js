import express from 'express';
const app = express();
// import { launch } from 'puppeteer';
import * as puppeteer from 'puppeteer';
import S3 from 'aws-sdk/clients/s3.js';
import chromium from 'chrome-aws-lambda'

const s3 = new S3({
    endpoint: 'https://173eba01c702ce7ebd38dceb4d4e5cbd.r2.cloudflarestorage.com',
    accessKeyId: 'df07da875bd30799ee343a5148b8caa5',
    secretAccessKey: '7d12007f1d74efce577229eb94c5b6ee44bb7527fc1c9c4810f3fbafd223e7da',
    signatureVersion: 'v4',
    credentials: {
        accessKeyId: 'df07da875bd30799ee343a5148b8caa5',
        secretAccessKey: '7d12007f1d74efce577229eb94c5b6ee44bb7527fc1c9c4810f3fbafd223e7da'
    }
})

// const app = require("express")();

let chrome = {};
// let puppeteer;

if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
    chrome = require("chrome-aws-lambda");
    puppeteer = require("puppeteer-core");
} else {
    // puppeteer = require("puppeteer");
    // const puppeteer = puppeteer();
}

app.get("/api", async (req, res) => {
    // let options = {};
    let options = {
        args: ["--hide-scrollbars", "--disable-web-security"],
        // defaultViewport: chrome.defaultViewport,
        defaultViewport: {
            width: 640,
            height: 480
        },
        executablePath: await chrome.executablePath,
        headless: true,
        ignoreHTTPSErrors: true,
    };

    if (process.env.AWS_LAMBDA_FUNCTION_VERSION) {
        options = {
            args: [...chrome.args, "--hide-scrollbars", "--disable-web-security"],
            // defaultViewport: chrome.defaultViewport,
            defaultViewport: {
				width: 640,
				height: 480
			},
            executablePath: await chrome.executablePath,
            headless: true,
            ignoreHTTPSErrors: true,
        };
    }

    try {
        let browser = await puppeteer.launch(options);

        let page = await browser.newPage();
        await page.goto("https://www.twitter.com");
        await page.waitForTimeout(500);
        const imageBuffer = await page.screenshot()
        const params = {
            Bucket: 'dropbox',
            Key: "facebook.png",
            ContentType: 'image/png',
            Body: imageBuffer
        }

        s3.upload(params, (error, data) => {
            console.log(error, data)
            if (error) {
                return res.json({
                    status: 'error',
                    error: error.message || 'Something went wrong'
                })
            }

            const params = {
                Bucket: 'dropbox',
                Key: "facebook.png",
                Expires: 60
            }

            const signedURL = s3.getSignedUrl('getObject', params)

            res.json({
                status: 'ok',
                data: signedURL
            })
        })
        await browser.close()

        // res.send(await page.title());
    } catch (err) {
        console.error(err);
        return null;
    }
});

app.listen(process.env.PORT || 3000, () => {
    console.log("Server started");
});