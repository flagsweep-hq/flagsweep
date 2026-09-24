import { createBrowserRouter, Navigate } from 'react-router'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { RootLayout } from '@/components/layout/RootLayout'
import { DashboardPage } from '@/pages/DashboardPage'
import { LoginPage } from '@/pages/LoginPage'
import { AuthSetupPage } from '@/pages/AuthSetupPage'
import { ConnectionFlagsPage } from '@/pages/ConnectionFlagsPage'
import { ConnectionFlagListPage } from '@/pages/ConnectionFlagListPage'
import { FlagDetailPage } from '@/pages/FlagDetailPage'
import { AcceptInvitePage } from '@/pages/AcceptInvitePage'
import { ResetPasswordPage } from '@/pages/ResetPasswordPage'
import { ChangePasswordPage } from '@/pages/ChangePasswordPage'

// Admin and settings screens load on demand; they pull in drag-and-drop and are rarely the landing page.
export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/setup',
    element: <AuthSetupPage />,
  },
  {
    path: '/invite/:token',
    element: <AcceptInvitePage />,
  },
  {
    path: '/reset-password',
    element: <ResetPasswordPage />,
  },
  {
    path: '/',
    element: <ProtectedRoute />,
    children: [
      {
        element: <RootLayout />,
        children: [
          {
            index: true,
            element: <DashboardPage />,
          },
          {
            path: 'new-connection',
            lazy: async () => ({ Component: (await import('@/pages/SetupPage')).SetupPage }),
          },
          {
            path: 'users',
            lazy: async () => ({ Component: (await import('@/pages/UsersPage')).UsersPage }),
          },
          {
            path: 'change-password',
            element: <ChangePasswordPage />,
          },
          {
            path: 'connections/:connectionId',
            children: [
              {
                // Flag-first: a connection opens on its flags, not its settings.
                index: true,
                element: <Navigate to="flags" replace />,
              },
              {
                path: 'flags',
                element: <ConnectionFlagListPage />,
              },
              {
                path: 'flags/:flagId',
                element: <FlagDetailPage />,
              },
              {
                path: 'environments/:environmentId',
                element: <ConnectionFlagsPage />,
              },
              {
                path: 'audit',
                lazy: async () => ({ Component: (await import('@/features/audit/AuditPage')).AuditPage }),
              },
              {
                path: 'settings',
                lazy: async () => ({ Component: (await import('@/pages/ConnectionSettingsPage')).ConnectionSettingsPage }),
              },
            ],
          },
        ],
      },
    ],
  },
])
