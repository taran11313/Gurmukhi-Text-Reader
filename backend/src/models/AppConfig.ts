export interface AppConfig {
  id: number
  totalPages: number
  title: string
  theme: {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
    fontFamily: string
  }
  createdAt: Date
  updatedAt: Date
}

export interface CreateAppConfigData {
  totalPages: number
  title: string
  theme: {
    primaryColor: string
    secondaryColor: string
    backgroundColor: string
    fontFamily: string
  }
}

export interface UpdateAppConfigData {
  totalPages?: number
  title?: string
  theme?: {
    primaryColor?: string
    secondaryColor?: string
    backgroundColor?: string
    fontFamily?: string
  }
}