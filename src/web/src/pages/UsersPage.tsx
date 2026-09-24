import { useState } from 'react'
import { apiErrorMessage } from '@/api/client'
import { Check, Copy, KeyRound, RotateCcw, ShieldAlert, Trash2, UserPlus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Skeleton } from '@/components/ui/skeleton'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { useAuth } from '@/contexts/AuthContext'
import { useUsers, useInviteUser, useDeleteUser, useChangeUserRole, useInvitations, useRevokeInvitation, useGenerateResetLink } from '@/hooks/useUsers'
import type { User, InviteResponse } from '@/types/auth'

export function UsersPage() {
  const { isAdmin, user: currentUser } = useAuth()

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <ShieldAlert className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-lg font-semibold">Access Denied</h2>
        <p className="text-muted-foreground text-sm mt-2">
          Only administrators can manage users.
        </p>
      </div>
    )
  }

  return <UsersPageContent currentUserId={currentUser?.id ?? ''} />
}

function UsersPageContent({ currentUserId }: { currentUserId: string }) {
  const { data: users, isLoading } = useUsers()
  const activeUsers = users?.filter((u) => !u.isDeleted)
  const deletedUsers = users?.filter((u) => u.isDeleted) ?? []
  const { data: invitations } = useInvitations()
  const inviteUser = useInviteUser()
  const revokeInvitation = useRevokeInvitation()
  const deleteUserMutation = useDeleteUser()
  const changeRole = useChangeUserRole()

  const [isInviteOpen, setIsInviteOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('Member')
  const [inviteResult, setInviteResult] = useState<InviteResponse | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [pendingDelete, setPendingDelete] = useState<User | null>(null)
  const [resetLink, setResetLink] = useState<string | null>(null)
  const resetPassword = useGenerateResetLink()

  function handleInvite() {
    if (!inviteEmail.trim()) return
    inviteUser.mutate(
      { email: inviteEmail.trim(), role: inviteRole },
      {
        onSuccess: (data) => {
          setInviteResult(data)
        },
      }
    )
  }

  const inviteError = inviteUser.error
    ? apiErrorMessage(inviteUser.error, 'Failed to create invitation.')
    : null

  function handleCloseInvite() {
    setIsInviteOpen(false)
    setInviteEmail('')
    setInviteRole('Member')
    setInviteResult(null)
    setCopied(null)
    inviteUser.reset()
  }

  function copyToClipboard(text: string, marker: string) {
    navigator.clipboard.writeText(text)
    setCopied(marker)
    setTimeout(() => setCopied(null), 2000)
  }

  function handleCopyLink(token: string) {
    copyToClipboard(`${window.location.origin}/invite/${token}`, token)
  }

  function handleResetPassword(userId: string) {
    resetPassword.mutate(userId, {
      onSuccess: (data) =>
        setResetLink(
          `${window.location.origin}/reset-password?email=${encodeURIComponent(data.email)}&token=${encodeURIComponent(data.token)}`,
        ),
    })
  }

  function handleDeleteConfirm() {
    if (!pendingDelete) return
    deleteUserMutation.mutate(pendingDelete.id, {
      onSettled: () => setPendingDelete(null),
    })
  }

  function handleRoleChange(userId: string, newRole: string) {
    changeRole.mutate({ id: userId, role: newRole })
  }

  function handleRestore(u: User) {
    inviteUser.mutate(
      { email: u.email, role: u.role },
      {
        onSuccess: (data) => {
          setInviteResult(data)
          setIsInviteOpen(true)
        },
      }
    )
  }

  return (
    <>
      <div className="flex items-center justify-between border-b px-6 py-3">
        <div className="flex items-center gap-3">
          <SidebarTrigger className="hidden md:flex" />
          <h1 className="text-lg font-semibold">User Management</h1>
        </div>
        <Dialog open={isInviteOpen} onOpenChange={(open) => { if (!open) handleCloseInvite(); else setIsInviteOpen(true) }}>
          <DialogTrigger asChild>
            <Button size="sm">
              <UserPlus className="h-4 w-4 mr-1" />
              Invite User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{inviteResult ? 'Invite Link Created' : 'Invite User'}</DialogTitle>
              <DialogDescription>
                {inviteResult
                  ? 'Share this link with the user. It expires in 7 days.'
                  : 'Send an invite link to a new team member.'}
              </DialogDescription>
            </DialogHeader>
            {inviteResult ? (
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Invite link for {inviteResult.email}</label>
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      value={`${window.location.origin}/invite/${inviteResult.token}`}
                      className="font-mono text-xs"
                    />
                    <Button variant="outline" size="icon" onClick={() => handleCopyLink(inviteResult.token)}>
                      {copied === inviteResult.token ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={handleCloseInvite}>Done</Button>
                </DialogFooter>
              </div>
            ) : (
              <>
                <div className="space-y-4 py-4">
                  {inviteError && (
                    <p className="text-sm text-destructive">{inviteError}</p>
                  )}
                  <div className="space-y-2">
                    <label htmlFor="invite-email" className="text-sm font-medium">Email</label>
                    <Input
                      id="invite-email"
                      type="email"
                      placeholder="user@example.com"
                      value={inviteEmail}
                      onChange={(e) => { setInviteEmail(e.target.value); inviteUser.reset() }}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Role</label>
                    <Select value={inviteRole} onValueChange={setInviteRole}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Member">Member</SelectItem>
                        <SelectItem value="Admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || inviteUser.isPending}
                  >
                    {inviteUser.isPending ? 'Creating...' : 'Create Invite Link'}
                  </Button>
                </DialogFooter>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>

      <div className="p-6 space-y-8 page-enter">
        {invitations && invitations.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Pending Invitations</h2>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invitations.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell className="font-medium">{inv.email}</TableCell>
                      <TableCell>
                        <Badge className={`border-0 font-medium ${inv.role === 'Admin' ? 'bg-violet-subtle text-violet' : 'bg-teal-subtle text-teal'}`}>
                          {inv.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(inv.expiresAt).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCopyLink(inv.token)}
                            title="Copy invite link"
                          >
                            {copied === inv.token ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => revokeInvitation.mutate(inv.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Revoke</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <div>
          <h2 className="text-sm font-medium text-muted-foreground mb-3">Users</h2>
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-24">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeUsers?.map((u) => {
                    const isSelf = u.id === currentUserId
                    return (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">
                          {u.email}
                          {isSelf && (
                            <Badge variant="outline" className="ml-2 text-xs">
                              You
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isSelf ? (
                            <Badge className={`border-0 font-medium ${u.role === 'Admin' ? 'bg-violet-subtle text-violet' : 'bg-teal-subtle text-teal'}`}>
                              {u.role}
                            </Badge>
                          ) : (
                            <Select
                              value={u.role}
                              onValueChange={(val) => handleRoleChange(u.id, val)}
                              disabled={changeRole.isPending}
                            >
                              <SelectTrigger className={`w-auto h-5.5 text-xs font-medium border-0 rounded-full px-2.5 gap-1 ${
                                u.role === 'Admin'
                                  ? 'bg-violet-subtle text-violet'
                                  : 'bg-teal-subtle text-teal'
                              }`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Member">Member</SelectItem>
                                <SelectItem value="Admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {!isSelf && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" onClick={() => handleResetPassword(u.id)} title="Reset password">
                                <KeyRound className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setPendingDelete(u)} className="text-muted-foreground hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {activeUsers?.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {deletedUsers.length > 0 && (
          <div>
            <h2 className="text-sm font-medium text-muted-foreground mb-3">Deleted Users</h2>
            <p className="text-xs text-muted-foreground mb-3">
              Deactivated accounts can no longer sign in. They stay listed so flag history
              keeps its author; flags they owned show "Deleted user" until reassigned.
              Restoring creates a new invite link — the account comes back with a new password.
            </p>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Deleted</TableHead>
                    <TableHead className="w-28">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deletedUsers.map((u) => (
                    <TableRow key={u.id} className="text-muted-foreground">
                      <TableCell className="font-medium line-through decoration-muted-foreground/50">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge className="border-0 font-medium bg-muted text-muted-foreground">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm">
                        {u.deletedAt ? new Date(u.deletedAt).toLocaleDateString() : '--'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRestore(u)}
                          disabled={inviteUser.isPending}
                          title="Create a re-invite link — accepting it reactivates this account with a new password"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Restore
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </div>

      <AlertDialog open={!!pendingDelete} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete user?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{pendingDelete?.email}</strong> will be deactivated and can no longer
              sign in. Their audit history is kept, and flags they own will show
              "Deleted user" until reassigned.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteUserMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteUserMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!resetLink} onOpenChange={(open) => { if (!open) setResetLink(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Password Reset Link</DialogTitle>
            <DialogDescription>Share this link with the user to let them set a new password.</DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 py-4">
            <Input readOnly value={resetLink ?? ''} className="font-mono text-xs" />
            <Button variant="outline" size="icon" onClick={() => resetLink && copyToClipboard(resetLink, 'reset')}>
              {copied === 'reset' ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <DialogFooter>
            <Button onClick={() => setResetLink(null)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
