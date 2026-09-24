import { api } from './client'
import type {
  FeatureFlag,
  CreateFlagRequest,
  UpdateFlagRequest,
  FlagMatrixRow,
} from '@/types/flag'
import { MAX_PAGE_SIZE, type Paged } from '@/types/paging'

export async function fetchFlags(
  connectionId: number,
  label: string | null
): Promise<FeatureFlag[]> {
  const params: Record<string, unknown> = { limit: MAX_PAGE_SIZE }
  if (label) params.label = label
  const res = await api.get<Paged<FeatureFlag>>(`/api/connections/${connectionId}/flags`, { params })
  return res.data.items
}

export async function createFlag(connectionId: number, req: CreateFlagRequest): Promise<void> {
  await api.post(`/api/connections/${connectionId}/flags`, req)
}

export async function updateFlag(
  connectionId: number,
  id: string,
  label: string | null,
  req: UpdateFlagRequest
): Promise<FeatureFlag> {
  const params = label ? { label } : {}
  const res = await api.patch<FeatureFlag>(`/api/connections/${connectionId}/flags/${id}`, req, { params })
  return res.data
}

export async function deleteFlag(connectionId: number, id: string, label: string | null): Promise<void> {
  const params = label ? { label } : {}
  await api.delete(`/api/connections/${connectionId}/flags/${id}`, { params })
}

export async function setFlagOwner(
  connectionId: number,
  id: string,
  userId: string | null
): Promise<void> {
  await api.patch(`/api/connections/${connectionId}/flags/${id}/owner`, { userId })
}

export async function setFlagLock(
  connectionId: number,
  id: string,
  label: string | null,
  locked: boolean
): Promise<void> {
  const params = label ? { label } : {}
  await api.patch(`/api/connections/${connectionId}/flags/${id}/lock`, { locked }, { params })
}

export async function fetchFlagMatrix(
  connectionId: number,
  limit = MAX_PAGE_SIZE
): Promise<FlagMatrixRow[]> {
  const res = await api.get<Paged<FlagMatrixRow>>(
    `/api/connections/${connectionId}/flags/matrix`,
    { params: { limit } }
  )
  return res.data.items
}
