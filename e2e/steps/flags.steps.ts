import { Given, When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { FlagsweepWorld } from '../support/world.js'
import { flagRow } from '../support/locators.js'

Given('I am on the {string} environment of {string}', async function (this: FlagsweepWorld, envName: string, connectionName: string) {
  const sidebar = this.page.locator('[data-slot="sidebar"]')
  await expect(sidebar.getByText(connectionName)).toBeVisible()

  const envTarget = sidebar.getByText(envName, { exact: true })
  if (!(await envTarget.first().isVisible())) {
    await sidebar.getByText('Environments', { exact: true }).click()
  }
  await envTarget.first().click()
  await this.page.waitForLoadState('networkidle')
})

Then('I should see {string} in the flags table', async function (this: FlagsweepWorld, text: string) {
  await expect(this.page.locator('table').getByText(text, { exact: true }).first()).toBeVisible({ timeout: 5_000 })
})

Then('I should not see {string} in the flags table', async function (this: FlagsweepWorld, text: string) {
  await expect(this.page.locator('table').getByText(text, { exact: true })).toHaveCount(0, { timeout: 5_000 })
})

const createDialog = (world: FlagsweepWorld) => world.page.locator('[data-slot="dialog-content"]')

async function startCreatingFlag(world: FlagsweepWorld, flagId: string) {
  await world.page.getByRole('button', { name: 'New Flag' }).first().click()
  await expect(createDialog(world)).toBeVisible()
  await createDialog(world).getByLabel('Flag ID', { exact: true }).fill(flagId)
}

async function finishCreatingFlag(world: FlagsweepWorld) {
  await createDialog(world).getByRole('button', { name: 'Create Flag' }).click()
  await expect(createDialog(world)).toBeHidden({ timeout: 10_000 })
}

When('I create the flag {string}', async function (this: FlagsweepWorld, flagId: string) {
  await startCreatingFlag(this, flagId)
  await finishCreatingFlag(this)
})

When('I start creating the flag {string}', async function (this: FlagsweepWorld, flagId: string) {
  await startCreatingFlag(this, flagId)
})

When('I finish creating the flag', async function (this: FlagsweepWorld) {
  await finishCreatingFlag(this)
})

When('I select the {string} environment in the dialog', async function (this: FlagsweepWorld, envName: string) {
  const dialog = this.page.locator('[data-slot="dialog-content"]')
  const checkbox = dialog.getByLabel(envName, { exact: true })
  if ((await checkbox.getAttribute('aria-checked')) !== 'true') await checkbox.click()
  await expect(checkbox).toHaveAttribute('aria-checked', 'true')
})

Then('the {string} environment should not be selectable in the dialog', async function (this: FlagsweepWorld, envName: string) {
  const dialog = this.page.locator('[data-slot="dialog-content"]')
  await expect(dialog.getByLabel(envName, { exact: true })).toBeDisabled()
})

When('I toggle {string}', async function (this: FlagsweepWorld, flagName: string) {
  await flagRow(this, flagName).locator('[data-slot="switch"]').click()
})

When('I confirm the toggle', async function (this: FlagsweepWorld) {
  await this.page.getByRole('button', { name: /Yes, enable|Yes, disable/ }).click()
  await expect(this.page.locator('[data-slot="alert-dialog-content"]')).toBeHidden({ timeout: 10_000 })
})

Then('the {string} flag should show {string}', async function (this: FlagsweepWorld, flagName: string, status: string) {
  const switchEl = flagRow(this, flagName).locator('[data-slot="switch"]')
  const expectedChecked = status === 'Enabled'
  await expect(switchEl).toHaveAttribute('aria-checked', String(expectedChecked), { timeout: 5_000 })
})

When('I delete the flag {string}', async function (this: FlagsweepWorld, flagName: string) {
  await flagRow(this, flagName).getByRole('button', { name: `Delete ${flagName}` }).click()
  await this.page.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(this.page.locator('[data-slot="alert-dialog-content"]')).toBeHidden({ timeout: 10_000 })
})

When('I open the edit dialog for {string}', async function (this: FlagsweepWorld, flagName: string) {
  await flagRow(this, flagName).getByRole('button', { name: `Edit ${flagName}` }).click()
  await expect(this.page.locator('[data-slot="dialog-content"]')).toBeVisible()
})

Then('the {string} flag should show retire-by {string}', async function (this: FlagsweepWorld, flagName: string, text: string) {
  await expect(flagRow(this, flagName).getByText(text, { exact: true })).toBeVisible()
})

Then('the {string} flag should be overdue for retirement', async function (this: FlagsweepWorld, flagName: string) {
  await expect(flagRow(this, flagName).locator('[data-status="overdue"]')).toBeVisible()
})

When('I lock the flag {string}', async function (this: FlagsweepWorld, flagName: string) {
  await flagRow(this, flagName).getByRole('button', { name: `Lock ${flagName}` }).click()
})

When('I unlock the flag {string}', async function (this: FlagsweepWorld, flagName: string) {
  await flagRow(this, flagName).getByRole('button', { name: `Unlock ${flagName}` }).click()
})

Then('the {string} flag should be locked', async function (this: FlagsweepWorld, flagName: string) {
  const row = flagRow(this, flagName)
  await expect(row.locator('[data-status="locked"]')).toBeVisible()
  await expect(row.locator('[data-slot="switch"]')).toBeDisabled()
  await expect(row.getByRole('button', { name: `Edit ${flagName}` })).toBeDisabled()
  await expect(row.getByRole('button', { name: `Delete ${flagName}` })).toBeDisabled()
})

Then('the {string} flag should not be locked', async function (this: FlagsweepWorld, flagName: string) {
  const row = flagRow(this, flagName)
  await expect(row.locator('[data-status="locked"]')).toHaveCount(0)
  await expect(row.locator('[data-slot="switch"]')).toBeEnabled()
  await expect(row.getByRole('button', { name: `Edit ${flagName}` })).toBeEnabled()
})

When('I assign {string} as the owner of {string}', async function (this: FlagsweepWorld, email: string, flagName: string) {
  await flagRow(this, flagName).getByRole('button', { name: `Owner of ${flagName}` }).click()
  await this.page.getByRole('option', { name: email }).click()
})

When('I assign {string} as the owner in the dialog', async function (this: FlagsweepWorld, email: string) {
  const dialog = this.page.locator('[data-slot="dialog-content"]')
  await dialog.getByRole('combobox').click()
  await this.page.getByRole('option', { name: email }).click()
})

Then('the {string} flag should show owner {string}', async function (this: FlagsweepWorld, flagName: string, ownerText: string) {
  await expect(flagRow(this, flagName).getByText(ownerText, { exact: true })).toBeVisible({ timeout: 5_000 })
})

Then('I should see the protected environment banner', async function (this: FlagsweepWorld) {
  await expect(
    this.page.getByText('This environment is protected. Only admins can modify flags.'),
  ).toBeVisible()
})
