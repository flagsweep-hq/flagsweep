import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { changePassword } from '@/api/authApi'

export function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [success, setSuccess] = useState(false)

  const mutation = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      setSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setSuccess(false), 3000)
    },
  })

  const passwordMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword
  const canSubmit = currentPassword.length > 0 && newPassword.length >= 6 && newPassword === confirmPassword && !mutation.isPending

  return (
    <>
      <div className="flex items-center border-b px-6 py-3">
        <SidebarTrigger className="hidden md:flex mr-3" />
        <h1 className="text-lg font-semibold">Change Password</h1>
      </div>
      <div className="p-6 max-w-md page-enter">
        <form onSubmit={(e) => { e.preventDefault(); if (canSubmit) mutation.mutate() }} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Current Password</label>
            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">New Password</label>
            <Input type="password" placeholder="At least 6 characters" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Confirm New Password</label>
            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
            {passwordMismatch && <p className="text-sm text-destructive">Passwords do not match</p>}
          </div>
          {mutation.isError && <p className="text-sm text-destructive">Failed to change password. Check your current password.</p>}
          {success && <p className="text-sm text-green-600">Password changed successfully.</p>}
          <Button type="submit" disabled={!canSubmit}>
            {mutation.isPending ? 'Changing...' : 'Change Password'}
          </Button>
        </form>
      </div>
    </>
  )
}
