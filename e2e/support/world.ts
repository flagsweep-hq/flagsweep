import { World, setWorldConstructor, Before, After, AfterAll, setDefaultTimeout } from '@cucumber/cucumber'
import { chromium, type Browser, type BrowserContext, type Page } from '@playwright/test'
import { Api } from './api.js'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:9090'
const HEADED = process.env.HEADED === '1' || process.env.HEADED === 'true'
const SLOW_MO = Number(process.env.SLOW_MO) || (HEADED ? 400 : 0)

setDefaultTimeout(45_000)

export class FlagsweepWorld extends World {
  browser!: Browser
  context!: BrowserContext
  page!: Page
  api!: Api
  baseUrl = BASE_URL
  token: string | null = null
  lastInviteUrl: string | null = null
}

setWorldConstructor(FlagsweepWorld)

let browser: Browser

Before(async function (this: FlagsweepWorld) {
  if (!browser) {
    browser = await chromium.launch({ headless: !HEADED, slowMo: SLOW_MO })
  }
  this.browser = browser
  this.context = await browser.newContext()
  this.page = await this.context.newPage()
  this.api = await Api.create()
  await this.api.reset()
})

Before({ tags: 'not @fresh-install' }, async function (this: FlagsweepWorld) {
  await this.api.createAdmin()
})

After(async function (this: FlagsweepWorld) {
  await this.api?.dispose()
  await this.page?.close()
  await this.context?.close()
})

AfterAll(async function () {
  await browser?.close()
})
