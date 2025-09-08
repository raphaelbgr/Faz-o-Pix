# Faz-o-Pix Setup Guide

Complete setup guide for the Faz-o-Pix development environment.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Detailed Setup](#detailed-setup)
- [Configuration](#configuration)
- [Development Workflow](#development-workflow)
- [Health Checks](#health-checks)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Ensure you have the following installed on your system:

### Required Software

- **Docker**: Version 20.10+ with Docker Compose
- **Git**: Version 2.30+
- **Node.js**: Version 18+ (optional, for local development without Docker)

### System Requirements

- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: At least 2GB free disk space
- **Ports**: Ensure ports 3000, 3001, 5432, and 6379 are available

### Operating System Support

- ✅ **macOS**: 10.15+ (Intel and Apple Silicon)
- ✅ **Linux**: Ubuntu 20.04+, Debian 11+, CentOS 8+
- ✅ **Windows**: Windows 10+ with WSL2

## Quick Start

Get the entire stack running with a single command:

```bash
# 1. Clone the repository
git clone <repository-url>
cd Faz-o-Pix

# 2. Copy environment configuration
cp .env.example .env

# 3. Start all services
docker-compose up --build
```

That's it! The application will be available at:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/health

## Detailed Setup

### 1. Environment Configuration

The `.env.example` file contains all necessary configuration with sensible defaults for development:

```bash
# Copy the example environment file
cp .env.example .env

# (Optional) Edit the configuration
nano .env
```

#### Environment Modes

The setup supports three different database configurations:

1. **Docker Mode (Default)**: Uses containerized PostgreSQL and Redis
2. **External Mode**: Uses external database server (192.168.7.101)  
3. **Production Mode**: Uses Supabase managed database

To switch modes, uncomment the appropriate `DATABASE_URL` in your `.env` file.

### 2. Docker Development

#### First-time Setup

```bash
# Build and start all services
docker-compose up --build -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

#### Service Management

```bash
# Start services
docker-compose up -d

# Stop services  
docker-compose down

# Restart a specific service
docker-compose restart backend

# View service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

#### Database Management

```bash
# Run database migrations
docker-compose exec backend npm run prisma:migrate

# Seed the database with test data
docker-compose exec backend npm run prisma:seed

# Access Prisma Studio
docker-compose exec backend npx prisma studio

# Reset the database (destructive!)
docker-compose exec backend npx prisma migrate reset
```

### 3. Local Development (Without Docker)

If you prefer to run services locally without Docker:

#### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Set up database (requires local PostgreSQL)
npm run prisma:migrate
npm run prisma:seed

# Start development server
npm run dev
```

#### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

#### Database Requirements

For local development without Docker, you need:

- **PostgreSQL 14+** running on localhost:5432
- **Redis 7+** running on localhost:6379 (optional)

## Configuration

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | Yes |
| `DATABASE_URL` | PostgreSQL connection string | Docker default | Yes |
| `REDIS_URL` | Redis connection string | Docker default | No |
| `JWT_SECRET` | JWT signing secret (32+ chars) | Dev default | Yes |
| `COOKIE_SECRET` | Cookie encryption secret (32+ chars) | Dev default | Yes |
| `ENCRYPTION_KEY` | Data encryption key (32 chars) | Dev default | Yes |
| `PORT` | Backend server port | `3001` | No |
| `HOST` | Server host binding | `0.0.0.0` | No |
| `CORS_ORIGIN` | Frontend origin for CORS | `http://localhost:3000` | No |

### Security Configuration

🔒 **Important**: For production environments, always generate strong, unique secrets:

```bash
# Generate JWT secret (32+ characters)
openssl rand -base64 32

# Generate cookie secret (32+ characters)
openssl rand -base64 32

# Generate encryption key (exactly 32 characters)
openssl rand -hex 16
```

### Service Ports

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 3000 | Next.js development server |
| Backend | 3001 | Fastify API server |
| PostgreSQL | 5432 | Database server |
| Redis | 6379 | Cache and session store |

## Development Workflow

### Hot Reloading

Both services support hot reloading:

- **Backend**: Changes to TypeScript files trigger automatic restart
- **Frontend**: Changes to React components trigger hot module replacement

### Code Quality

Run quality checks before committing:

```bash
# Backend
cd backend
npm run lint          # ESLint
npm run typecheck     # TypeScript checking
npm test              # Unit tests

# Frontend
cd frontend  
npm run lint          # ESLint
npm run typecheck     # TypeScript checking
npm test              # Unit tests
```

### Database Operations

```bash
# Create a new migration
cd backend
npx prisma migrate dev --name migration_name

# Generate Prisma client (after schema changes)
npx prisma generate

# View database with Prisma Studio
npx prisma studio
```

### API Development

- **Swagger Documentation**: http://localhost:3001/docs
- **Health Check**: http://localhost:3001/health
- **Detailed Health**: http://localhost:3001/health/detailed

## Health Checks

The application includes comprehensive health checks:

### Basic Health Check

```bash
curl http://localhost:3001/health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "services": {
    "database": "connected",
    "redis": "connected"
  },
  "version": "1.0.0",
  "uptime": 12345
}
```

### Detailed Health Check

```bash
curl http://localhost:3001/health/detailed
```

Includes additional system metrics and service diagnostics.

### Container Health Checks

Docker automatically monitors service health:

```bash
# Check container health status
docker-compose ps

# View health check logs
docker-compose logs backend | grep health
```

## Development Tips

### Performance Optimization

1. **Use Docker volumes** for `node_modules` to improve build speed
2. **Enable BuildKit** for faster Docker builds:
   ```bash
   export DOCKER_BUILDKIT=1
   ```
3. **Use `.dockerignore`** to reduce build context size

### Debugging

1. **Backend Debugging**: Use VS Code with Docker extension
2. **Database Debugging**: Use Prisma Studio or pgAdmin
3. **Redis Debugging**: Use Redis CLI:
   ```bash
   docker-compose exec redis redis-cli
   ```

### Common Commands

```bash
# View all container logs
docker-compose logs

# Clean up everything (careful!)
docker-compose down -v --remove-orphans
docker system prune -a

# Update dependencies
docker-compose build --no-cache

# Access container shell
docker-compose exec backend sh
docker-compose exec frontend sh
```

## Production Considerations

### Database Migration

For production deployments:

1. Use managed PostgreSQL (Supabase, AWS RDS, etc.)
2. Run migrations before deployment:
   ```bash
   npx prisma migrate deploy
   ```
3. Use environment-specific `.env` files

### Security Checklist

- [ ] Generate strong secrets for JWT, cookies, and encryption
- [ ] Use HTTPS in production
- [ ] Configure proper CORS origins
- [ ] Enable rate limiting
- [ ] Set up monitoring and logging
- [ ] Use Docker secrets for sensitive data

### Monitoring

The application provides metrics endpoints for monitoring:

- Health checks for uptime monitoring
- Structured logging for log aggregation
- Performance metrics in health endpoint

## Next Steps

After setup completion:

1. **Read the [Development Guide](./DEVELOPMENT.md)** for detailed development workflows
2. **Check [API Documentation](http://localhost:3001/docs)** for API reference
3. **Review [Architecture Overview](./ARCHITECTURE.md)** to understand the system design
4. **See [Troubleshooting Guide](./TROUBLESHOOTING.md)** for common issues

## Support

If you encounter issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Review service logs: `docker-compose logs [service-name]`
3. Verify environment configuration
4. Ensure all prerequisites are met

For additional help, create an issue in the project repository.