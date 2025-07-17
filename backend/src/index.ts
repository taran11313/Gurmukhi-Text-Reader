import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import dotenv from 'dotenv'
import pdfRoutes from './routes/pdfRoutes'
import pageRoutes from './routes/pageRoutes'
import navigationRoutes from './routes/navigationRoutes'

// Load environment variables
dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

// Middleware
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Health check endpoint
app.get('/health', (_req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Punjabi Religious Reader API is running',
    timestamp: new Date().toISOString()
  })
})

// API routes
app.get('/api', (_req, res) => {
  res.json({ 
    message: 'Punjabi Religious Reader API',
    version: '1.0.0'
  })
})

// PDF processing routes
app.use('/api/pdf', pdfRoutes)

// Page serving routes
app.use('/api/pages', pageRoutes)

// Navigation routes
app.use('/api/navigation', navigationRoutes)

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack)
  res.status(500).json({ 
    error: 'Something went wrong!',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  })
})

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Start server only if not in test environment
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📖 Punjabi Religious Reader API ready`)
  })
}

export default app