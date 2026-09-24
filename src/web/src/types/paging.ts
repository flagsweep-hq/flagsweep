export interface Paged<T> {
  items: T[]
  total: number
  offset: number
  hasMore: boolean
}

export const MAX_PAGE_SIZE = 500
