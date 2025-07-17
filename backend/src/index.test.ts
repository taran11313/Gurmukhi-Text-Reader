import request from 'supertest'
import app from './index'

describe('API Server', () => {
  it('should respond to health check', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200)
    
    expect(response.body.status).toBe('OK')
    expect(response.body.message).toBe('Punjabi Religious Reader API is running')
  })

  it('should respond to API root', async () => {
    const response = await request(app)
      .get('/api')
      .expect(200)
    
    expect(response.body.message).toBe('Punjabi Religious Reader API')
    expect(response.body.version).toBe('1.0.0')
  })

  it('should return 404 for unknown routes', async () => {
    const response = await request(app)
      .get('/unknown-route')
      .expect(404)
    
    expect(response.body.error).toBe('Route not found')
  })
})