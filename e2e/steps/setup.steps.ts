import { When, Then } from '@cucumber/cucumber'
import { FlagsweepWorld } from '../support/world.js'
import { accounts } from '../support/accounts.js'

When('I open the application', async function (this: FlagsweepWorld) {
  await this.page.goto(this.baseUrl)
})

When('I open the setup page', async function (this: FlagsweepWorld) {
  await this.page.goto(`${this.baseUrl}/setup`)
  await this.page.waitForLoadState('networkidle')
})

Then('I should be on the setup page', async function (this: FlagsweepWorld) {
  await this.page.waitForURL('**/setup')
})

When('I enter the admin account details', async function (this: FlagsweepWorld) {
  await this.page.getByLabel('Email', { exact: true }).fill(accounts.admin.email)
  await this.page.getByLabel('Password', { exact: true }).fill(accounts.admin.password)
  await this.page.getByLabel('Confirm Password', { exact: true }).fill(accounts.admin.password)
})

When('I enter the admin account details with a password confirmation that does not match', async function (this: FlagsweepWorld) {
  await this.page.getByLabel('Email', { exact: true }).fill(accounts.admin.email)
  await this.page.getByLabel('Password', { exact: true }).fill(accounts.admin.password)
  await this.page.getByLabel('Confirm Password', { exact: true }).fill(`${accounts.admin.password}-typo`)
})
