import { When } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { FlagsweepWorld } from '../support/world.js'
import { connectionStringFor } from '../support/stores.js'

When('I enter the connection string for store {string}', async function (this: FlagsweepWorld, host: string) {
  await this.page.getByPlaceholder('Endpoint=https://...;Id=...;Secret=...').fill(connectionStringFor(host))
})

When('I connect the store {string}', async function (this: FlagsweepWorld, host: string) {
  await this.page.getByPlaceholder('Endpoint=https://...;Id=...;Secret=...').fill(connectionStringFor(host))
  await this.page.getByRole('button', { name: 'Connect', exact: true }).click()
  await expect(this.page.getByPlaceholder('e.g. My App')).toBeVisible({ timeout: 10_000 })
})

When('I fill in the connection name with {string}', async function (this: FlagsweepWorld, name: string) {
  await this.page.getByPlaceholder('e.g. My App').fill(name)
})

When('I add a custom environment named {string}', async function (this: FlagsweepWorld, envName: string) {
  await addCustomEnvironment(this, envName, null)
})

When('I try to add a custom environment named {string} again', async function (this: FlagsweepWorld, envName: string) {
  await submitCustomEnvironment(this, envName, null)
})

When('I add a custom environment named {string} with label {string}', async function (this: FlagsweepWorld, envName: string, label: string) {
  await addCustomEnvironment(this, envName, label)
})

async function submitCustomEnvironment(world: FlagsweepWorld, envName: string, label: string | null) {
  const { page } = world
  const envInput = page.getByPlaceholder('Environment name')
  await envInput.waitFor({ state: 'visible', timeout: 15000 })
  await envInput.fill(envName)
  if (label !== null) await page.getByPlaceholder('Label', { exact: true }).fill(label)
  await page.getByRole('button', { name: 'Add', exact: true }).click()
}

async function addCustomEnvironment(world: FlagsweepWorld, envName: string, label: string | null) {
  await submitCustomEnvironment(world, envName, label)
  await expect(world.page.getByPlaceholder('Environment name')).toHaveValue('', { timeout: 5_000 })
}
