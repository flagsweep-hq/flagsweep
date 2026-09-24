export type ProviderType = 'Azure'

export interface Connection {
  id: number
  name: string
  providerType: ProviderType
  endpoint: string
  createdAt: string
  environments: ConnectionEnvironment[]
}

export interface ConnectionEnvironment {
  id: number
  name: string
  environmentKey: string | null
  sortOrder: number
  isProtected: boolean
}

export interface CreateConnectionRequest {
  name: string
  providerType: ProviderType
  connectionString: string
  environments: CreateEnvironmentRequest[]
}

export interface DiscoverStoreRequest {
  providerType: ProviderType
  connectionString: string
}

export interface StoreMetadata {
  storeName: string | null
  endpoint: string
  labels: string[]
}

export interface UpdateConnectionStringRequest {
  connectionString: string
}

export interface ConnectionStatus {
  status: 'connected' | 'failed'
  message: string | null
  checkedAt: string
}

export interface CreateEnvironmentRequest {
  name: string
  environmentKey: string | null
}

export interface ReorderEnvironmentsRequest {
  environmentIds: number[]
}
