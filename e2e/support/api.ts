import { request, type APIRequestContext } from '@playwright/test'
import { accounts, type Role } from './accounts.js'
import { connectionStringFor } from './stores.js'

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:9090'
const E2E_SECRET = process.env.E2E_SECRET ?? 'flagsweep-e2e'

const ENVIRONMENT_KEYS: Record<string, string> = {
  Development: 'dev',
  Production: 'prod',
  Staging: 'staging',
}

export const STORE_HOSTS: Record<string, string> = { 'Azure App': 'fake.azconfig.io' }

interface SeededConnection {
  id: number
  environments: { id: number; name: string; environmentKey: string | null }[]
}

export class Api {
  private tokens: Partial<Record<Role, string>> = {}
  private connections = new Map<string, SeededConnection>()
  private memberId: string | null = null

  private constructor(private http: APIRequestContext) {}

  static async create() {
    return new Api(await request.newContext({ baseURL: BASE_URL }))
  }

  dispose() {
    return this.http.dispose()
  }

  private async send(method: 'post' | 'patch' | 'delete' | 'get', url: string, as: Role | null, data?: unknown) {
    const headers = as ? { Authorization: `Bearer ${await this.tokenFor(as)}` } : undefined
    const res = await this.http[method](url, { headers, data })
    if (!res.ok()) throw new Error(`${method.toUpperCase()} ${url} answered ${res.status()}: ${await res.text()}`)
    return res
  }

  async reset() {
    const res = await this.http.post('/api/sandbox/reset', { headers: { 'X-E2E-Secret': E2E_SECRET } })
    if (res.status() !== 204) {
      throw new Error(`reset answered ${res.status()}; the app must run with --sandbox --e2e and the same E2E secret`)
    }
    this.tokens = {}
    this.connections.clear()
    this.memberId = null
  }

  async createAdmin() {
    await this.send('post', '/api/auth/setup', null, accounts.admin)
  }

  async tokenFor(role: Role): Promise<string> {
    if (role === 'member') await this.ensureMember()
    if (!this.tokens[role]) {
      const res = await this.http.post('/api/auth/login', { data: accounts[role] })
      if (!res.ok()) throw new Error(`login as ${role} answered ${res.status()}`)
      this.tokens[role] = (await res.json()).accessToken
    }
    return this.tokens[role]!
  }

  async inviteMember(): Promise<string> {
    const res = await this.send('post', '/api/users/invitations', 'admin', {
      email: accounts.member.email,
      role: 'Member',
    })
    return (await res.json()).token
  }

  async ensureMember(): Promise<string> {
    if (this.memberId) return this.memberId
    const token = await this.inviteMember()
    await this.send('post', '/api/auth/accept-invite', null, { token, password: accounts.member.password })
    const users = await (await this.send('get', '/api/users', 'admin')).json()
    this.memberId = users.items.find((u: { email: string }) => u.email === accounts.member.email).id
    return this.memberId!
  }

  async deleteMember() {
    await this.send('delete', `/api/users/${await this.ensureMember()}`, 'admin')
    delete this.tokens.member
  }

  async createConnection(name: string, environmentNames: string[]) {
    const host = STORE_HOSTS[name] ?? `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.azconfig.io`
    const res = await this.send('post', '/api/connections', 'admin', {
      name,
      providerType: 'Azure',
      connectionString: connectionStringFor(host),
      environments: environmentNames.map((n) => ({ name: n, environmentKey: ENVIRONMENT_KEYS[n] ?? n.toLowerCase() })),
    })
    this.connections.set(name, await res.json())
  }

  private onlyConnection(): SeededConnection {
    if (this.connections.size !== 1) throw new Error('this step needs exactly one seeded connection')
    return [...this.connections.values()][0]
  }

  private environment(name: string) {
    const env = this.onlyConnection().environments.find((e) => e.name === name)
    if (!env) throw new Error(`no seeded environment named "${name}"`)
    return env
  }

  private flagUrl(flagId: string, suffix = '', environmentName?: string) {
    const label = environmentName ? `?label=${encodeURIComponent(this.environment(environmentName).environmentKey ?? '')}` : ''
    return `/api/connections/${this.onlyConnection().id}/flags/${encodeURIComponent(flagId)}${suffix}${label}`
  }

  async createFlag(flagId: string, environmentNames: string[], as: Role = 'admin', extra: Record<string, unknown> = {}) {
    await this.send('post', `/api/connections/${this.onlyConnection().id}/flags`, as, {
      id: flagId,
      labels: environmentNames.map((n) => this.environment(n).environmentKey),
      ...extra,
    })
  }

  async protect(environmentName: string) {
    const connection = this.onlyConnection()
    await this.send(
      'patch',
      `/api/connections/${connection.id}/environments/${this.environment(environmentName).id}/protection`,
      'admin',
      { isProtected: true },
    )
  }

  async lockFlag(flagId: string, environmentName: string) {
    await this.send('patch', this.flagUrl(flagId, '/lock', environmentName), 'admin', { locked: true })
  }

  async assignOwner(flagId: string, role: Role) {
    const userId =
      role === 'member'
        ? await this.ensureMember()
        : (await (await this.send('get', '/api/auth/me', 'admin')).json()).id
    await this.send('patch', this.flagUrl(flagId, '/owner'), 'admin', { userId })
  }
}
