import { api } from './client'
import type { ConnectionEnvironment, CreateEnvironmentRequest, ReorderEnvironmentsRequest } from '@/types/connection'

export async function addEnvironment(
  connectionId: number,
  req: CreateEnvironmentRequest
): Promise<ConnectionEnvironment> {
  const res = await api.post<ConnectionEnvironment>(
    `/api/connections/${connectionId}/environments`,
    req
  )
  return res.data
}

export async function reorderEnvironments(
  connectionId: number,
  req: ReorderEnvironmentsRequest
): Promise<void> {
  await api.patch(`/api/connections/${connectionId}/environments`, req)
}

export async function updateEnvironment(
  connectionId: number,
  environmentId: number,
  req: { name?: string; environmentKey?: string }
): Promise<ConnectionEnvironment> {
  const res = await api.put<ConnectionEnvironment>(
    `/api/connections/${connectionId}/environments/${environmentId}`,
    req
  )
  return res.data
}

export async function deleteEnvironment(
  connectionId: number,
  environmentId: number
): Promise<void> {
  await api.delete(`/api/connections/${connectionId}/environments/${environmentId}`)
}

export async function setEnvironmentProtection(
  connectionId: number,
  environmentId: number,
  isProtected: boolean
): Promise<void> {
  await api.patch(
    `/api/connections/${connectionId}/environments/${environmentId}/protection`,
    { isProtected }
  )
}
