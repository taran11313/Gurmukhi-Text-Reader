export interface UserSession {
  sessionId: string
  currentPage: number
  lastVisited: Date
  bookmarks?: number[]
}

export interface CreateUserSessionData {
  sessionId: string
  currentPage: number
  bookmarks?: number[]
}

export interface UpdateUserSessionData {
  currentPage?: number
  bookmarks?: number[]
}