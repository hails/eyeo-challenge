import * as puppeteer from 'puppeteer'
import * as fs from 'fs'

(async () => {
  const SAMPLE_URL = 'https://www.bfmtv.com/international/les-chiens-ont-accompagne-les-premiers-humains-sur-le-continent-nord-americain_AD-202102240179.html'
  const PRIVACY_BUTTON_AGREE_SELECTOR = '#didomi-notice-agree-button'
  const ADS_EVENT_SELECTOR = '[onmousedown]'
  const FOOTER_SELECTOR = '.footer'

  const extensionPath = require('path').join(__dirname, 'abp_chrome')
  const browser = await puppeteer.launch({
    headless: false,
    args: [
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`
    ],
    defaultViewport: {
      width: 1200,
      height: 1200
    }
  })

  const page = await browser.newPage()

  // Wait for ABP to initialize
  await page.waitForTimeout(6000)

  await page.goto(SAMPLE_URL)

  await page.bringToFront()

  // Accept privacy cookies, if any
  const privacyButton = await page.waitForSelector(PRIVACY_BUTTON_AGREE_SELECTOR, { timeout: 5000 })
  if (privacyButton) {
    await page.click(PRIVACY_BUTTON_AGREE_SELECTOR)
  }

  // The ads load as you scroll through the document, so let's scroll straight to the footer and load'em'all
  await page.hover(FOOTER_SELECTOR)
  // They might take a while to load, so let's wait a little bit
  await page.waitForTimeout(10000)

  // Let's only get the bouding boxes only from those where it's content coming from from 'paid.outbrain.com'
  const adsBoudingBoxes = await page.$$eval(ADS_EVENT_SELECTOR,
    (nodes) => nodes.map(
      (node) => {
        const parent = node.parentElement as Element

        if (parent.innerHTML.includes('paid.outbrain.com')) {
          const {
            x,
            y,
            width,
            height
          } = parent.getBoundingClientRect().toJSON()

          return {
            x,
            y,
            width,
            height
          }
        }

        return null
      }
    )
  )

  // Write to file while also filtering out possible null values
  fs.writeFileSync('ads_bouding_recs.json', JSON.stringify(adsBoudingBoxes.filter(x => x)), { encoding: 'ascii' })

  await page.screenshot({ path: 'ads.png', fullPage: true })

  await browser.close()
})()
