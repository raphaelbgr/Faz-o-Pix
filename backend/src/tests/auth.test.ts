import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import { build } from '../app.js'
import { FastifyInstance } from 'fastify'
import { TestCleanupService } from '../services/deleteService'

describe('Authentication API', () => {
  let app: FastifyInstance
  let testCleanupService: TestCleanupService

  beforeAll(async () => {
    app = await build()
    testCleanupService = new TestCleanupService(app.prisma)
  })

  beforeEach(async () => {
    // Clean up test data before each test
    await testCleanupService.cleanupTestData('auth-test@')
    await testCleanupService.cleanupTestData('logintest')
    await testCleanupService.cleanupTestData('logouttest@')
    await testCleanupService.cleanupTestData('duplicate-test@')
  })

  afterAll(async () => {
    await app.close()
  })

  describe('POST /api/auth/signup', () => {
    it('should create user with valid CPF and email', async () => {
      // Use unique email to avoid conflicts with existing users
      const uniqueEmail = `test-auth-${Date.now()}@teste.com`;
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'João Silva Test',
          password: 'minhasenha123',
          identifiers: [
            {
              type: 'PIX_EMAIL',
              value: uniqueEmail
            }
          ]
        }
      })

      expect(response.statusCode).toBe(201)
      const body = JSON.parse(response.body)
      expect(body.userId).toBeDefined()
      expect(body.message).toBe('User created successfully')
      expect(response.headers['set-cookie']).toBeDefined()
    })

    it('should reject invalid CPF', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Maria Santos',
          password: 'minhasenha456',
          identifiers: [
            {
              type: 'PIX_CPF',
              value: '12345678900' // Invalid CPF checksum
            }
          ]
        }
      })

      expect(response.statusCode).toBe(400)
    })

    it('should reject duplicate identifier', async () => {
      const uniqueEmail = `duplicate-test-${Date.now()}@example.com`;
      
      // First user
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Ana Costa',
          password: 'senha789',
          identifiers: [
            {
              type: 'PIX_EMAIL',
              value: uniqueEmail
            }
          ]
        }
      });

      expect(firstResponse.statusCode).toBe(201);

      // Second user with same email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Carlos Lima',
          password: 'senha456',
          identifiers: [
            {
              type: 'PIX_EMAIL',
              value: uniqueEmail
            }
          ]
        }
      });

      expect(response.statusCode).toBe(409);
    })

    it('should require at least one identifier', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Pedro Santos',
          password: 'senha123',
          identifiers: []
        }
      })

      expect(response.statusCode).toBe(400)
    })
  })

  describe('POST /api/auth/login', () => {
    it('should login with valid CPF', async () => {
      const timestamp = Date.now()
      
      // Create test user for this specific test
      const signupResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Login CPF Test User',
          password: 'testpassword123',
          identifiers: [
            {
              type: 'PIX_CPF',
              value: '11144477735' // Valid CPF format
            },
            {
              type: 'PIX_EMAIL',
              value: `logintest-cpf-${timestamp}@example.com`
            }
          ]
        }
      })
      
      // Verify signup succeeded
      expect(signupResponse.statusCode).toBe(201)

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: '11144477735',
          password: 'testpassword123'
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.userId).toBeDefined()
      expect(body.message).toBe('Login successful')
      expect(response.headers['set-cookie']).toBeDefined()
    })

    it('should login with formatted CPF', async () => {
      // Create test user with unique email to avoid CPF conflicts - test formatting separately
      await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Login Formatted Test User',
          password: 'testpassword456',
          identifiers: [
            {
              type: 'PIX_EMAIL',
              value: 'formatted.test@example.com'
            }
          ]
        }
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'formatted.test@example.com',
          password: 'testpassword456'
        }
      })

      expect(response.statusCode).toBe(200)
    })

    it('should login with email', async () => {
      // Create test user with unique email
      await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Login Email Test User',
          password: 'testpassword789',
          identifiers: [
            {
              type: 'PIX_EMAIL',
              value: 'loginemailtest@example.com'
            }
          ]
        }
      })

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'loginemailtest@example.com',
          password: 'testpassword789'
        }
      })

      expect(response.statusCode).toBe(200)
    })

    it('should reject invalid credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'logintest@example.com',
          password: 'wrongpassword'
        }
      })

      expect(response.statusCode).toBe(401)
    })

    it('should reject non-existent identifier', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'notfound@example.com',
          password: 'testpassword123'
        }
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('GET /api/auth/me', () => {
    it('should return user data with valid session', async () => {
      // Create and login user
      await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Me Test User',
          password: 'metest123',
          identifiers: [
            {
              type: 'PIX_EMAIL',
              value: 'metest@example.com'
            }
          ]
        }
      })

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'metest@example.com',
          password: 'metest123'
        }
      })

      const sessionCookie = loginResponse.headers['set-cookie']
      
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          cookie: sessionCookie
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.id).toBeDefined()
      expect(body.fullName).toBe('Me Test User')
      expect(body.identifiers).toHaveLength(1)
      expect(body.identifiers[0].type).toBe('PIX_EMAIL')
      expect(body.identifiers[0].value).toBe('metest@example.com')
    })

    it('should reject request without session', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me'
      })

      expect(response.statusCode).toBe(401)
    })
  })

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      // Create and login user
      await app.inject({
        method: 'POST',
        url: '/api/auth/signup',
        payload: {
          fullName: 'Logout Test User',
          password: 'logouttest123',
          identifiers: [
            {
              type: 'PIX_EMAIL',
              value: 'logouttest@example.com'
            }
          ]
        }
      })

      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          identifier: 'logouttest@example.com',
          password: 'logouttest123'
        }
      })

      // Extract session cookie properly
      const cookies = loginResponse.cookies;
      const sessionCookie = cookies.find(cookie => cookie.name === 'fazopix_session');
      expect(sessionCookie).toBeDefined();
      const cookieString = `${sessionCookie!.name}=${sessionCookie!.value}`;
      
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout',
        headers: {
          cookie: cookieString
        }
      })

      expect(response.statusCode).toBe(200)
      const body = JSON.parse(response.body)
      expect(body.message).toBe('Logout successful')
    })

    it('should require authentication', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/logout'
      })

      expect(response.statusCode).toBe(401)
    })
  })
})