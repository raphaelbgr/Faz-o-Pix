# Development Environment Configuration

## Server Ports
- **Frontend**: http://localhost:3000 (Next.js)
- **Backend**: http://localhost:3001 (Fastify)

## Test Configuration
When running Playwright tests, always use:
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:3001`

## Server Status
Before starting new servers, check if they're already running:
- Frontend usually runs on port 3000
- Backend usually runs on port 3001
- If port 3000 is busy, Next.js will try 3001, but we want to keep 3001 for backend

## Development Workflow
1. Start backend: `cd backend && npm run dev` (runs on 3001)
2. Start frontend: `cd frontend && npm run dev` (runs on 3000)
3. Both servers should be running simultaneously for full functionality