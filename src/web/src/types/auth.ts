export interface User {
  id: string
  email: string
  role: 'Admin' | 'Member'
  createdAt: string
  isDeleted: boolean
  deletedAt: string | null
}

export interface AssignableUser {
  id: string
  email: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  tokenType: string
  accessToken: string
  expiresIn: number
  refreshToken: string
}

export interface AuthStatus {
  isSetup: boolean
}

export interface InviteRequest {
  email: string
  role?: string
}

export interface InviteResponse {
  id: number
  email: string
  role: string
  token: string
  inviteUrl: string
  expiresAt: string
}

export interface InvitationDto {
  id: number
  email: string
  role: string
  token: string
  expiresAt: string
  createdAt: string
}

export interface AcceptInviteRequest {
  token: string
  password: string
}

export interface ChangePasswordRequest {
  currentPassword: string
  newPassword: string
}

export interface ResetPasswordRequest {
  email: string
  token: string
  newPassword: string
}

export interface ResetLinkResponse {
  email: string
  token: string
  resetUrl: string
}
