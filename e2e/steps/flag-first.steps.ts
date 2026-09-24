import { When, Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { FlagsweepWorld } from '../support/world.js'
import { flagRow } from '../support/locators.js'

Then('I should see {string} in the flag list', async function (this: FlagsweepWorld, flagName: string) {
  await expect(flagRow(this, flagName).first()).toBeVisible({ timeout: 5_000 })
})

Then('I should not see {string} in the flag list', async function (this: FlagsweepWorld, flagName: string) {
  await expect(flagRow(this, flagName)).toHaveCount(0)
})

Then(
  'the {string} flag should show its rollout across environments',
  async function (this: FlagsweepWorld, flagName: string) {
    const row = flagRow(this, flagName).first()
    await expect(row).toBeVisible()
    await expect(row.getByText(/on in \d+ of \d+|not set anywhere/)).toBeAttached()
  },
)

When('I open the {string} flag', async function (this: FlagsweepWorld, flagName: string) {
  await flagRow(this, flagName).first().getByRole('link').first().click()
  await this.page.waitForLoadState('networkidle')
  await expect(this.page.getByRole('heading', { name: flagName })).toBeVisible({ timeout: 5_000 })
})

Then(
  'the flag detail should list the environment {string}',
  async function (this: FlagsweepWorld, envName: string) {
    await expect(
      this.page.getByRole('heading', { name: 'Rollout' }),
    ).toBeVisible({ timeout: 5_000 })
    await expect(this.page.getByText(envName, { exact: true }).first()).toBeVisible()
  },
)

Then(
  'the flag detail should show {string} for {string}',
  async function (this: FlagsweepWorld, state: string, envName: string) {
    const control = this.page.getByLabel(new RegExp(`in ${envName}$`)).first()
    await expect(control).toHaveAttribute('aria-checked', state === 'Enabled' ? 'true' : 'false', {
      timeout: 10_000,
    })
  },
)

When(
  'I click the {string} chip on the {string} flag',
  async function (this: FlagsweepWorld, envName: string, flagName: string) {
    const row = flagRow(this, flagName).first()
    await row.getByRole('button', { name: new RegExp(`in ${envName}\\.`) }).first().click()
  },
)

Then(
  'the {string} chip on the {string} flag should read {string}',
  async function (this: FlagsweepWorld, envName: string, flagName: string, state: string) {
    const row = flagRow(this, flagName).first()
    await expect(
      row.getByRole('button', { name: new RegExp(`^${state} in ${envName}\\.`) }).first(),
    ).toBeVisible({ timeout: 10_000 })
  },
)

When(
  'I rename the flag to {string} with description {string}',
  async function (this: FlagsweepWorld, name: string, description: string) {
    await this.page.getByRole('button', { name: 'Edit' }).first().click()
    const save = this.page.getByRole('button', { name: 'Save Changes' })
    await expect(save).toBeVisible()
    await this.page.getByLabel('Name', { exact: true }).fill(name)
    await this.page.getByLabel('Description', { exact: true }).fill(description)
    await save.click()
    await expect(save).toHaveCount(0, { timeout: 10_000 })
    await this.page.waitForLoadState('networkidle')
  },
)

Then(
  'the flag detail should be titled {string}',
  async function (this: FlagsweepWorld, name: string) {
    await expect(this.page.getByRole('heading', { name })).toBeVisible({ timeout: 10_000 })
  },
)

When('I lock the flag in {string}', async function (this: FlagsweepWorld, envName: string) {
  await this.page
    .getByRole('button', { name: new RegExp(`^Lock .* in ${envName}$`) })
    .first()
    .click()
})

When('I unlock the flag in {string}', async function (this: FlagsweepWorld, envName: string) {
  await this.page
    .getByRole('button', { name: new RegExp(`^Unlock .* in ${envName}$`) })
    .first()
    .click()
})

Then(
  'the flag detail should show {string} as pending',
  async function (this: FlagsweepWorld, summary: string) {
    await expect(this.page.getByText(summary, { exact: false }).first()).toBeVisible({
      timeout: 5_000,
    })
  },
)

Then(
  'the flag should be locked in {string}',
  async function (this: FlagsweepWorld, envName: string) {
    await expect(
      this.page.getByRole('button', { name: new RegExp(`^Unlock .* in ${envName}$`) }).first(),
    ).toBeVisible({ timeout: 10_000 })
  },
)

Then(
  'the flag should not be locked in {string}',
  async function (this: FlagsweepWorld, envName: string) {
    await expect(
      this.page.getByRole('button', { name: new RegExp(`^Lock .* in ${envName}$`) }).first(),
    ).toBeVisible({ timeout: 10_000 })
  },
)

When('I delete the flag permanently', async function (this: FlagsweepWorld) {
  await this.page.getByRole('button', { name: 'Delete', exact: true }).first().click()
  const dialog = this.page.getByRole('alertdialog')
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'Delete permanently' }).click()
  await expect(dialog).toBeHidden({ timeout: 10_000 })
  await this.page.waitForURL(/\/flags$/, { timeout: 10_000 })
  await this.page.waitForLoadState('networkidle')
})

When(
  'I assign {string} as owner of {string} in the flag list',
  async function (this: FlagsweepWorld, email: string, flagName: string) {
    await this.page.getByRole('button', { name: `Owner of ${flagName}` }).first().click()
    await this.page.getByRole('option', { name: email }).first().click()
    await this.page.waitForLoadState('networkidle')
  },
)

Then(
  'the {string} flag should show owner {string} in the flag list',
  async function (this: FlagsweepWorld, flagName: string, owner: string) {
    const row = flagRow(this, flagName).first()
    await expect(row.getByText(owner, { exact: false }).first()).toBeVisible({ timeout: 10_000 })
  },
)

When(
  'I switch {string} on in {string} in the environment editor',
  async function (this: FlagsweepWorld, flagName: string, envName: string) {
    const control = this.page.getByLabel(`${flagName} in ${envName}`, { exact: true })
    if ((await control.getAttribute('aria-checked')) !== 'true') await control.click()
  },
)

When(
  'I add {string} to {string} in the environment editor',
  async function (this: FlagsweepWorld, flagName: string, envName: string) {
    await this.page.getByRole('button', { name: `Add ${flagName} to ${envName}` }).click()
  },
)

When('I apply the environment changes', async function (this: FlagsweepWorld) {
  await this.page.getByRole('button', { name: 'Apply changes' }).click()
  await expect(this.page.getByText('No changes')).toBeVisible({ timeout: 10_000 })
  await this.page.waitForLoadState('networkidle')
})

Then(
  'the environment editor should show {string} as read-only',
  async function (this: FlagsweepWorld, envName: string) {
    await expect(this.page.getByText('Protected — admins only').first()).toBeVisible()

    const toggle = this.page.getByLabel(new RegExp(`in ${envName}$`))
    const add = this.page.getByRole('button', { name: new RegExp(`to ${envName}$`) })
    const control = (await toggle.count()) > 0 ? toggle : add
    await expect(control.first()).toBeDisabled()
  },
)
