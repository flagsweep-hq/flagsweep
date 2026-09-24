import { Then } from '@cucumber/cucumber'
import { expect } from '@playwright/test'
import { FlagsweepWorld } from '../support/world.js'

Then(
  'the latest audit entry should show {string} changed {string} from {string} to {string} by {string}',
  async function (this: FlagsweepWorld, flagId: string, field: string, from: string, to: string, actor: string) {
    const card = this.page.locator('div.rounded-lg.bg-card').first()
    const header = card.getByRole('button').first()
    await expect(header).toContainText(flagId)
    await expect(header).toContainText(field)
    await expect(header).toContainText(actor)

    await header.click()
    const changeRow = card.locator('tbody tr', { hasText: flagId })
    await expect(changeRow).toContainText(field)
    await expect(changeRow.locator('td').nth(2)).toHaveText(from)
    await expect(changeRow.locator('td').nth(3)).toHaveText(to)
  },
)

Then('the audit log should contain an entry for {string} by {string}', async function (this: FlagsweepWorld, flagId: string, actor: string) {
  const card = this.page.locator('div.rounded-lg.bg-card', { hasText: flagId }).filter({ hasText: actor })
  await expect(card.first()).toBeVisible()
})
