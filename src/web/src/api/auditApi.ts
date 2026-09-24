import { api } from './client'
import type { Paged } from '@/types/paging'

interface AuditChange {
  flagId: string
  field: string
  from: string | null
  to: string | null
}

export interface AuditEntry {
  id: number
  connectionId: number
  environmentId: number
  triggeredById: string
  triggeredByEmail: string
  changes: AuditChange[]
  createdAt: string
}

export async function fetchAuditEntries(
  connectionId: number,
  params?: { environmentId?: number; limit?: number; offset?: number }
): Promise<Paged<AuditEntry>> {
  const res = await api.get<Paged<AuditEntry>>(`/api/connections/${connectionId}/audit`, { params })
  return res.data
}
