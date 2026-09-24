import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { FlagsweepWorld } from '../support/world.js'
import { connectionStringFor } from '../support/stores.js'

function envRow(world: FlagsweepWorld, envName: string) {
  return world.page.locator('.rounded-md.border.bg-card', {
    has: world.page.getByRole('button', { name: `Reorder ${envName}`, exact: true }),
  })
}

When('I add a custom environment {string} with label {string} in settings', async function (this: FlagsweepWorld, envName: string, label: string) {
  await this.page.getByRole('button', { name: 'Add Environment' }).click()
  await this.page.getByRole('button', { name: 'Add custom' }).click()
  await this.page.getByPlaceholder('e.g. staging').fill(envName)
  await this.page.getByPlaceholder('Label (optional)').fill(label)
  await this.page.getByRole('button', { name: 'Add Environment' }).click()
  await expect(envRow(this, envName)).toBeVisible({ timeout: 5_000 })
})

When('I rename the environment {string} to {string}', async function (this: FlagsweepWorld, from: string, to: string) {
  const row = envRow(this, from)
  await row.getByRole('button').nth(1).click()
  const nameInput = this.page.getByPlaceholder('Name')
  await nameInput.fill(to)
  await nameInput.press('Enter')
  await expect(envRow(this, to)).toBeVisible({ timeout: 5_000 })
})

When('I delete the environment {string}', async function (this: FlagsweepWorld, envName: string) {
  await envRow(this, envName).getByRole('button').last().click()
  await expect(this.page.getByText('Delete environment?')).toBeVisible()
  await this.page.getByRole('button', { name: 'Delete environment' }).click()
  await expect(envRow(this, envName)).toHaveCount(0, { timeout: 5_000 })
})

When('I turn on protection for {string}', async function (this: FlagsweepWorld, envName: string) {
  const toggle = this.page.getByRole('switch', { name: `Toggle protection for ${envName}` })
  await toggle.click()
  await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 5_000 })
})

Then('the environment {string} should be marked protected in settings', async function (this: FlagsweepWorld, envName: string) {
  const toggle = this.page.getByRole('switch', { name: `Toggle protection for ${envName}` })
  await expect(toggle).toHaveAttribute('aria-checked', 'true')
})

Then('I should see the {string} badge', async function (this: FlagsweepWorld, text: string) {
  await expect(this.page.locator('[data-slot="badge"]', { hasText: text }).first()).toBeVisible()
})

When('I replace the connection string with a new secret for store {string}', async function (this: FlagsweepWorld, host: string) {
  await this.page.getByRole('button', { name: 'Replace connection string' }).click()
  await this.page.getByPlaceholder('Endpoint=https://...;Id=...;Secret=...').fill(connectionStringFor(host, 'cm90YXRlZA=='))
  await this.page.getByRole('button', { name: 'Save', exact: true }).click()
})
