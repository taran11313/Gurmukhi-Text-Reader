export interface Page {
  id: number
  pageNumber: number
  imageUrl: string
  thumbnailUrl: string
  width: number
  height: number
  processedAt: Date
}

export interface CreatePageData {
  pageNumber: number
  imageUrl: string
  thumbnailUrl: string
  width: number
  height: number
}

export interface UpdatePageData {
  imageUrl?: string
  thumbnailUrl?: string
  width?: number
  height?: number
}