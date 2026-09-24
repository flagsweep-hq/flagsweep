import axios from 'axios'
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useAuth } from '@/contexts/AuthContext'
import { login as loginApi, getAuthStatus, getMe } from '@/api/authApi'
import { TOKEN_KEY } from '@/api/client'
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { LoginRequest } from '@/types/auth'
import { LogoMark } from '@/components/shared/LogoMark'

export function LoginPage() {
  const navigate = useNavigate()
  const auth = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [checkingStatus, setCheckingStatus] = useState(true)

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginRequest>()

  useEffect(() => {
    if (auth.isAuthenticated) {
      navigate('/', { replace: true })
      return
    }

    getAuthStatus()
      .then((status) => {
        if (!status.isSetup) {
          navigate('/setup', { replace: true })
        }
      })
      .catch(() => {
      })
      .finally(() => {
        setCheckingStatus(false)
      })
  }, [auth.isAuthenticated, navigate])

  async function onSubmit(data: LoginRequest) {
    setError(null)
    try {
      const response = await loginApi(data)
      localStorage.setItem(TOKEN_KEY, response.accessToken)
      const user = await getMe()
      auth.login(response.accessToken, user)
      navigate('/', { replace: true })
    } catch (err: unknown) {
      localStorage.removeItem(TOKEN_KEY)
      if (axios.isAxiosError(err) && err.response?.status === 401) {
        setError('Invalid email or password.')
      } else {
        setError('An unexpected error occurred. Please try again.')
      }
    }
  }

  if (checkingStatus) {
    return (
      <div className="flex min-h-screen items-center justify-center auth-bg">
        <div className="text-muted-foreground text-sm animate-fade-in">Loading...</div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center auth-bg px-4">
      <div className="w-full max-w-sm animate-slide-up">
        <div className="flex flex-col items-center gap-3 mb-8">
          <LogoMark size={48} />
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Flagsweep
          </h1>
        </div>

        <Card className="border-border/60 shadow-xl shadow-black/[0.03]">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-lg font-semibold">Welcome back</CardTitle>
            <CardDescription>Sign in to your account</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {error && (
                <div className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  autoComplete="email"
                  required
                  {...register('email', { required: true })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  {...register('password', { required: true })}
                />
              </div>
            </CardContent>
            <CardFooter className="pt-2">
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? 'Signing in...' : 'Sign in'}
              </Button>
            </CardFooter>
          </form>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Feature flag management, simplified.
        </p>
      </div>
    </div>
  )
}
