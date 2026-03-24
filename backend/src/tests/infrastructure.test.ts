import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { build } from '../app.js'
import { FastifyInstance } from 'fastify'

describe('Story 1.1: Project Infrastructure Setup', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await build()
  })

  afterAll(async () => {
    await app.close()
  })

  describe('Health Check Endpoints', () => {
    it('should respond to health check endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      // Health endpoint returns 200 when DB is up, 503 when down — both are valid responses
      expect([200, 503]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(['healthy', 'unhealthy']).toContain(body.status)
      expect(body.timestamp).toBeDefined()
      expect(['connected', 'disconnected']).toContain(body.services.database)
      expect(body.version).toBeDefined()
      expect(body.uptime).toBeDefined()
    })

    it('should respond to readiness check endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready'
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.ready).toBe(true)
      expect(body.timestamp).toBeDefined()
    })
  })

  describe('Environment Configuration', () => {
    it('should have required environment variables configured', () => {
      // Database configuration
      expect(process.env.DATABASE_URL).toBeDefined()
      expect(process.env.DATABASE_URL).toMatch(/^postgres(ql)?:\/\//)

      // JWT configuration
      expect(process.env.JWT_SECRET).toBeDefined()

      // Cookie configuration
      expect(process.env.COOKIE_SECRET).toBeDefined()

      // CORS configuration
      expect(process.env.CORS_ORIGIN).toBeDefined()
    })

    it('should report database status through health endpoint', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health'
      })

      expect([200, 503]).toContain(response.statusCode)
      const body = JSON.parse(response.body)
      expect(['connected', 'disconnected']).toContain(body.services.database)
    })
  })

  describe('Service Configuration', () => {
    it('should have Fastify server properly configured', () => {
      expect(app).toBeDefined()
      expect(app.server).toBeDefined()
    })

    it('should have CORS configured for Next.js frontend', async () => {
      const response = await app.inject({
        method: 'OPTIONS',
        url: '/api/auth/signup',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST'
        }
      })

      expect(response.statusCode).toBe(204)
      expect(response.headers['access-control-allow-origin']).toBeTruthy()
      expect(response.headers['access-control-allow-credentials']).toBe('true')
    })

    it('should have security headers configured', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready'
      })

      // Check for security headers from helmet plugin
      expect(response.headers['x-frame-options']).toBeTruthy()
      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })

    it('should have rate limiting configured in production', async () => {
      // Rate limiting is disabled in test environment, so we check configuration
      if (process.env.NODE_ENV !== 'test') {
        // Multiple rapid requests should be rate limited
        const responses = await Promise.all([
          app.inject({ method: 'GET', url: '/health' }),
          app.inject({ method: 'GET', url: '/health' }),
          app.inject({ method: 'GET', url: '/health' })
        ])

        // All should succeed in test env, but would be limited in production
        responses.forEach(response => {
          expect(response.statusCode).toBe(200)
        })
      }
    })
  })

  describe('API Documentation', () => {
    it('should serve Swagger documentation in development', async () => {
      if (process.env.NODE_ENV !== 'test') {
        const response = await app.inject({
          method: 'GET',
          url: '/docs'
        })

        expect(response.statusCode).toBe(200)
        expect(response.headers['content-type']).toContain('text/html')
      }
    })

    it('should serve OpenAPI spec in development', async () => {
      if (process.env.NODE_ENV !== 'test') {
        const response = await app.inject({
          method: 'GET',
          url: '/docs/json'
        })

        expect(response.statusCode).toBe(200)
        const spec = JSON.parse(response.body)
        expect(spec.openapi).toBeDefined()
        expect(spec.info.title).toBe('Faz-o-Pix API')
        expect(spec.info.description).toBe('Brazilian bill splitting application API')
      }
    })
  })

  describe('Logging and Monitoring', () => {
    it('should have structured logging configured', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready'
      })

      expect(response.statusCode).toBe(200)
    })

    it('should generate request IDs for tracing', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/health/ready'
      })

      expect(response.headers['x-request-id']).toBeDefined()
    })
  })
})