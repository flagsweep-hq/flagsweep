import { api } from './client'
import type {
  Connection,
  CreateConnectionRequest,
  DiscoverStoreRequest,
  StoreMetadata,
  UpdateConnectionStringRequest,
  ConnectionStatus,
} from '@/types/connection'
import { MAX_PAGE_SIZE, type Paged } from '@/types/paging'

export async function fetchConnections(): Promise<Connection[]> {
  const res = await api.get<Paged<Connection>>('/api/connections', {
    params: { limit: MAX_PAGE_SIZE },
  })
  return res.data.items
}

export async function fetchConnection(connectionId: number): Promise<Connection> {
  const res = await api.get<Connection>(`/api/connections/${connectionId}`)
  return res.data
}

export async function createConnection(req: CreateConnectionRequest): Promise<Connection> {
  const res = await api.post<Connection>('/api/connections', req)
  return res.data
}

export async function discoverStore(req: DiscoverStoreRequest): Promise<StoreMetadata> {
  const res = await api.post<StoreMetadata>('/api/connections/discover', req)
  return res.data
}

export async function updateConnectionString(
  connectionId: number,
  req: UpdateConnectionStringRequest,
): Promise<void> {
  await api.put(`/api/connections/${connectionId}/connection-string`, req)
}

export async function fetchConnectionStatus(connectionId: number): Promise<ConnectionStatus> {
  const res = await api.get<ConnectionStatus>(`/api/connections/${connectionId}/status`)
  return res.data
}

export async function fetchConnectionLabels(connectionId: number): Promise<string[]> {
  const res = await api.get<string[]>(`/api/connections/${connectionId}/labels`)
  return res.data
}
