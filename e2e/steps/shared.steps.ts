import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { FlagsweepWorld } from '../support/world.js'
import { accounts, WRONG_PASSWORD, type Role } from '../support/accounts.js'

async function signInViaApi(world: FlagsweepWorld, email: string, password: string) {
  const loginRes = await world.page.request.post(`${world.baseUrl}/api/auth/login`, {
    data: { email, password },
  })
  expect(loginRes.ok(), `login as ${email} failed with ${loginRes.status()}`).toBeTruthy()
  const { accessToken } = await loginRes.json()

  const meRes = await world.page.request.get(`${world.baseUrl}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  expect(meRes.ok()).toBeTruthy()
  const user = await meRes.json()

  world.token = accessToken
  await world.page.goto(world.baseUrl)
  await world.page.evaluate(
    ({ token, user }) => {
      localStorage.setItem('flagsweep_token', token)
      localStorage.setItem('flagsweep_user', JSON.stringify(user))
    },
    { token: accessToken, user },
  )
  await world.page.goto(world.baseUrl)
  await world.page.waitForLoadState('networkidle')
}

async function signInThroughTheForm(world: FlagsweepWorld, email: string, password: string) {
  await world.page.goto(`${world.baseUrl}/login`)
  await world.page.waitForLoadState('networkidle')
  await world.page.getByLabel('Email').fill(email)
  await world.page.getByLabel('Password', { exact: true }).fill(password)
  await world.page.getByRole('button', { name: 'Sign in' }).click()
}

Given(/^I am signed in as an? (admin|member)$/, async function (this: FlagsweepWorld, role: Role) {
  if (role === 'member') await this.api.ensureMember()
  await signInViaApi(this, accounts[role].email, accounts[role].password)
})

When(/^I sign in as an? (admin|member)$/, async function (this: FlagsweepWorld, role: Role) {
  await signInThroughTheForm(this, accounts[role].email, accounts[role].password)
})

When(/^I sign in as an? (admin|member) with the wrong password$/, async function (this: FlagsweepWorld, role: Role) {
  await signInThroughTheForm(this, accounts[role].email, WRONG_PASSWORD)
})

Then('I should still be on the login page', async function (this: FlagsweepWorld) {
  await expect(this.page).toHaveURL(/\/login$/)
})

When('I open the users page', async function (this: FlagsweepWorld) {
  await this.page.goto(`${this.baseUrl}/users`)
  await this.page.waitForLoadState('networkidle')
})

When('I open the new connection page', async function (this: FlagsweepWorld) {
  await this.page.goto(`${this.baseUrl}/new-connection`)
  await this.page.waitForLoadState('networkidle')
})

When('I navigate to the {string} page of connection {string}', async function (this: FlagsweepWorld, pageName: string, connectionName: string) {
  const res = await this.page.request.get(`${this.baseUrl}/api/connections`, {
    headers: { Authorization: `Bearer ${this.token}` },
  })
  expect(res.ok()).toBeTruthy()
  const { items } = await res.json()
  const connection = items.find((p: { name: string }) => p.name === connectionName)
  expect(connection, `connection "${connectionName}" not found`).toBeTruthy()
  await this.page.goto(`${this.baseUrl}/connections/${connection.id}/${pageName.toLowerCase()}`)
  await this.page.waitForLoadState('networkidle')
})

When('I open the {string} page of {string} from the sidebar', async function (this: FlagsweepWorld, linkName: string, connectionName: string) {
  const sidebar = this.page.locator('[data-slot="sidebar"]')
  await expect(sidebar.getByText(connectionName)).toBeVisible()
  await sidebar.getByRole('link', { name: linkName, exact: true }).click()
  await this.page.waitForLoadState('networkidle')
})

Then('I should be on the dashboard', async function (this: FlagsweepWorld) {
  await this.page.waitForURL(`${this.baseUrl}/`, { timeout: 10_000 })
  await expect(this.page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()
})

Then('I should be on the login page', async function (this: FlagsweepWorld) {
  await this.page.waitForURL('**/login', { timeout: 10_000 })
})

const openDialog = (world: FlagsweepWorld) => world.page.locator('[data-slot="dialog-content"]')

When('I fill in {string} with {string} in the dialog', async function (this: FlagsweepWorld, label: string, value: string) {
  await expect(openDialog(this)).toBeVisible()
  await openDialog(this).getByLabel(label, { exact: true }).fill(value)
})

When('I click {string}', async function (this: FlagsweepWorld, buttonText: string) {
  await this.page.getByRole('button', { name: buttonText }).first().click()
})

When('I save the dialog', async function (this: FlagsweepWorld) {
  await openDialog(this).getByRole('button', { name: 'Save Changes' }).click()
  await expect(openDialog(this)).toBeHidden({ timeout: 10_000 })
})

When('I turn on {string} in the dialog', async function (this: FlagsweepWorld, label: string) {
  const dialog = this.page.locator('[data-slot="dialog-content"]')
  const control = dialog.getByLabel(label, { exact: true })
  if ((await control.getAttribute('aria-checked')) !== 'true') await control.click()
  await expect(control).toHaveAttribute('aria-checked', 'true')
})

Then('I should see {string}', async function (this: FlagsweepWorld, text: string) {
  await expect(this.page.getByText(text).first()).toBeVisible()
})

Then('I should see {string} in the sidebar', async function (this: FlagsweepWorld, text: string) {
  await expect(this.page.locator('[data-slot="sidebar"]').getByText(text)).toBeVisible()
})

Then('I should not see {string} in the sidebar', async function (this: FlagsweepWorld, text: string) {
  const sidebar = this.page.locator('[data-slot="sidebar"]')
  await expect(sidebar.getByText('Dashboard')).toBeVisible()
  await expect(sidebar.getByText(text, { exact: true })).toHaveCount(0)
})

Then('the {string} button should be disabled', async function (this: FlagsweepWorld, name: string) {
  await expect(this.page.getByRole('button', { name, exact: true }).first()).toBeDisabled()
})
