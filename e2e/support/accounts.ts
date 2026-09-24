export type Role = 'admin' | 'member'

export const accounts: Record<Role, { email: string; password: string }> = {
  admin: { email: 'admin@test.com', password: 'password123' },
  member: { email: 'member@test.com', password: 'memberpass1' },
}

export const WRONG_PASSWORD = 'not-the-password'
