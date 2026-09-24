import { useState } from 'react'
import { useParams, useNavigate } from 'react-router'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { validateInvite, acceptInvite, login as loginApi, getMe } from '@/api/authApi'
import { TOKEN_KEY } from '@/api/client'
import { useAuth } from '@/contexts/AuthContext'

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const { login: authLogin } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const { data: invite, isLoading, isError } = useQuery({
    queryKey: ['invite', token],
    queryFn: () => validateInvite(token!),
    enabled: !!token,
    retry: false,
  })

  const accept = useMutation({
    mutationFn: async () => {
      await acceptInvite({ token: token!, password })
      const response = await loginApi({ email: invite!.email, password })
      localStorage.setItem(TOKEN_KEY, response.accessToken)
      const user = await getMe()
      return { accessToken: response.accessToken, user }
    },
    onSuccess: ({ accessToken, user }) => {
      authLogin(accessToken, user)
      navigate('/')
    },
  })

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Validating invite...</p>
      </div>
    )
  }

  if (isError || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Invitation</CardTitle>
            <CardDescription>
              This invite link is invalid or has expired. Please ask your administrator for a new one.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/login')} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const passwordMismatch = confirmPassword.length > 0 && password !== confirmPassword
  const canSubmit = password.length >= 6 && password === confirmPassword && !accept.isPending

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Accept Invitation</CardTitle>
          <CardDescription>
            Set a password to complete your account setup.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => { e.preventDefault(); if (canSubmit) accept.mutate() }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input value={invite.email} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Role</label>
              <Input value={invite.role} disabled />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirm Password</label>
              <Input
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              {passwordMismatch && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>
            {accept.isError && (
              <p className="text-sm text-destructive">
                Failed to create account. Please try again.
              </p>
            )}
            <Button type="submit" className="w-full" disabled={!canSubmit}>
              {accept.isPending ? 'Creating account...' : 'Create Account'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
