import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { FlagsweepWorld } from '../support/world.js'
import { accounts } from '../support/accounts.js'

function userRow(world: FlagsweepWorld, email: string) {
  return world.page.locator('table tbody tr', { hasText: email })
}

Then('I should see an invite link for {string}', async function (this: FlagsweepWorld, email: string) {
  await expect(this.page.getByText(`Invite link for ${email}`)).toBeVisible({ timeout: 5_000 })
  const dialog = this.page.locator('[data-slot="dialog-content"]')
  this.lastInviteUrl = await dialog.locator('input[readonly]').inputValue()
  expect(this.lastInviteUrl).toContain('/invite/')
})

When('I open the invite link for {string}', async function (this: FlagsweepWorld, email: string) {
  const res = await this.page.request.get(`${this.baseUrl}/api/users/invitations`, {
    headers: { Authorization: `Bearer ${this.token}` },
  })
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  const items: { email: string; token: string }[] = Array.isArray(body) ? body : body.items
  const invite = items.find((i) => i.email === email)
  expect(invite, `no pending invitation for ${email}`).toBeTruthy()
  this.lastInviteUrl = `${this.baseUrl}/invite/${invite!.token}`
  await this.context.clearCookies()
  await this.page.goto(this.lastInviteUrl)
  await this.page.evaluate(() => localStorage.clear())
  await this.page.goto(this.lastInviteUrl)
  await this.page.waitForLoadState('networkidle')
})

When('I open the last invite link again', async function (this: FlagsweepWorld) {
  expect(this.lastInviteUrl, 'no invite link recorded').toBeTruthy()
  await this.context.clearCookies()
  await this.page.evaluate(() => localStorage.clear())
  await this.page.goto(this.lastInviteUrl!)
  await this.page.waitForLoadState('networkidle')
})

When('I set my password', async function (this: FlagsweepWorld) {
  await this.page.getByPlaceholder('At least 6 characters').fill(accounts.member.password)
  await this.page.getByPlaceholder('Confirm your password').fill(accounts.member.password)
  await this.page.getByRole('button', { name: 'Create Account' }).click()
})

When('I change the role of {string} to {string}', async function (this: FlagsweepWorld, email: string, role: string) {
  await userRow(this, email).getByRole('combobox').click()
  await this.page.getByRole('option', { name: role, exact: true }).click()
})

Then('{string} should have the role {string}', async function (this: FlagsweepWorld, email: string, role: string) {
  await expect(userRow(this, email).getByRole('combobox')).toHaveText(role, { timeout: 5_000 })
})

When('I delete the user {string}', async function (this: FlagsweepWorld, email: string) {
  await userRow(this, email).getByRole('button').last().click()
  await expect(this.page.getByText('Delete user?')).toBeVisible()
  await this.page.getByRole('button', { name: 'Delete', exact: true }).click()
  await expect(this.page.locator('[data-slot="alert-dialog-content"]')).toBeHidden({ timeout: 10_000 })
})

Then('{string} should be listed as a deleted user', async function (this: FlagsweepWorld, email: string) {
  await expect(this.page.getByRole('heading', { name: 'Deleted Users' })).toBeVisible()
  await expect(this.page.locator('td.line-through', { hasText: email })).toBeVisible()
})

Then('{string} should be listed as an active user', async function (this: FlagsweepWorld, email: string) {
  await expect(this.page.locator('td.line-through', { hasText: email })).toHaveCount(0)
  await expect(userRow(this, email).getByRole('combobox')).toBeVisible()
})

When('I restore the user {string}', async function (this: FlagsweepWorld, email: string) {
  await userRow(this, email).getByRole('button', { name: 'Restore' }).click()
  await expect(this.page.getByText('Invite Link Created')).toBeVisible()
})
