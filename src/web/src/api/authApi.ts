import { api } from './client'
import type {
  AuthResponse,
  AuthStatus,
  LoginRequest,
  User,
  InviteRequest,
  InviteResponse,
  InvitationDto,
  AcceptInviteRequest,
  ChangePasswordRequest,
  ResetPasswordRequest,
  ResetLinkResponse,
  AssignableUser,
} from '@/types/auth'
import { MAX_PAGE_SIZE, type Paged } from '@/types/paging'

export async function getAuthStatus(): Promise<AuthStatus> {
  const res = await api.get<AuthStatus>('/api/status')
  return res.data
}

export async function login(req: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/login', req)
  return res.data
}

export async function setup(req: LoginRequest): Promise<AuthResponse> {
  const res = await api.post<AuthResponse>('/api/auth/setup', req)
  return res.data
}

export async function getMe(): Promise<User> {
  const res = await api.get<User>('/api/auth/me')
  return res.data
}

export async function fetchUsers(): Promise<User[]> {
  const res = await api.get<Paged<User>>('/api/users', { params: { limit: MAX_PAGE_SIZE } })
  return res.data.items
}

export async function fetchAssignableUsers(): Promise<AssignableUser[]> {
  const res = await api.get<Paged<AssignableUser>>('/api/users/assignable', {
    params: { limit: MAX_PAGE_SIZE },
  })
  return res.data.items
}

export async function inviteUser(req: InviteRequest): Promise<InviteResponse> {
  const res = await api.post<InviteResponse>('/api/users/invitations', req)
  return res.data
}

export async function fetchInvitations(): Promise<InvitationDto[]> {
  const res = await api.get<Paged<InvitationDto>>('/api/users/invitations', {
    params: { limit: MAX_PAGE_SIZE },
  })
  return res.data.items
}

export async function revokeInvitation(id: number): Promise<void> {
  await api.delete(`/api/users/invitations/${id}`)
}

export async function validateInvite(token: string): Promise<{ email: string; role: string }> {
  const res = await api.get<{ email: string; role: string }>(`/api/auth/invite/${token}`)
  return res.data
}

export async function acceptInvite(req: AcceptInviteRequest): Promise<void> {
  await api.post('/api/auth/accept-invite', req)
}

export async function changePassword(req: ChangePasswordRequest): Promise<void> {
  await api.post('/api/auth/change-password', req)
}

export async function resetUserPassword(id: string): Promise<ResetLinkResponse> {
  const res = await api.post<ResetLinkResponse>(`/api/users/${id}/reset-password`)
  return res.data
}

export async function resetPassword(req: ResetPasswordRequest): Promise<void> {
  await api.post('/api/auth/reset-password', req)
}

export async function deleteUser(id: string): Promise<void> {
  await api.delete(`/api/users/${id}`)
}

export async function changeUserRole(
  id: string,
  role: string
): Promise<void> {
  await api.patch(`/api/users/${id}/role`, { role })
}
