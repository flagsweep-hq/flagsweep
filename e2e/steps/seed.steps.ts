import { Given } from '@cucumber/cucumber'
import { FlagsweepWorld } from '../support/world.js'
import type { Role } from '../support/accounts.js'

function listOf(names: string): string[] {
  return names.split(/,| and /).map((n) => n.trim()).filter(Boolean)
}

Given('the connection {string} with environments {string}', async function (this: FlagsweepWorld, name: string, environments: string) {
  await this.api.createConnection(name, listOf(environments))
})

Given('the {string} environment is protected', async function (this: FlagsweepWorld, environment: string) {
  await this.api.protect(environment)
})

Given('the flag {string} exists in {string}', async function (this: FlagsweepWorld, flagId: string, environments: string) {
  await this.api.createFlag(flagId, listOf(environments))
})

Given('the flag {string} named {string} exists in {string}', async function (this: FlagsweepWorld, flagId: string, displayName: string, environments: string) {
  await this.api.createFlag(flagId, listOf(environments), 'admin', { displayName })
})

Given('the flag {string} exists in {string} with retire-by date {string}', async function (this: FlagsweepWorld, flagId: string, environments: string, date: string) {
  await this.api.createFlag(flagId, listOf(environments), 'admin', { expiresAt: `${date}T00:00:00Z` })
})

Given('the member created the flag {string} in {string}', async function (this: FlagsweepWorld, flagId: string, environments: string) {
  await this.api.createFlag(flagId, listOf(environments), 'member')
})

Given('the flag {string} is locked in {string}', async function (this: FlagsweepWorld, flagId: string, environment: string) {
  await this.api.lockFlag(flagId, environment)
})

Given(/^the flag "([^"]+)" is owned by the (admin|member)$/, async function (this: FlagsweepWorld, flagId: string, role: Role) {
  await this.api.assignOwner(flagId, role)
})

Given('a member exists', async function (this: FlagsweepWorld) {
  await this.api.ensureMember()
})

Given('the member has been invited', async function (this: FlagsweepWorld) {
  await this.api.inviteMember()
})

Given('the member has been deleted', async function (this: FlagsweepWorld) {
  await this.api.deleteMember()
})
