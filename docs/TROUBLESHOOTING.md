# Faz-o-Pix Troubleshooting Guide

Common issues and solutions for the Faz-o-Pix development environment.

## Table of Contents

- [Quick Diagnostics](#quick-diagnostics)
- [Docker Issues](#docker-issues)
- [Database Issues](#database-issues)
- [Redis Issues](#redis-issues)
- [Network Issues](#network-issues)
- [Performance Issues](#performance-issues)
- [Development Issues](#development-issues)
- [Platform-Specific Issues](#platform-specific-issues)

## Quick Diagnostics

Before diving into specific issues, run these diagnostic commands:

```bash
# Check service status
docker-compose ps

# Check service health
curl -f http://localhost:3001/health

# View recent logs from all services
docker-compose logs --tail=50

# Check system resources
docker stats
```

## Docker Issues

### Services Won't Start

**Symptoms**: `docker-compose up` fails or services exit immediately

**Common Causes & Solutions**:

1. **Port Conflicts**
   ```bash
   # Check what's using the ports
   lsof -i :3000  # Frontend
   lsof -i :3001  # Backend
   lsof -i :5432  # PostgreSQL
   lsof -i :6379  # Redis
   
   # Kill processes using the ports
   sudo kill -9 <PID>
   ```

2. **Insufficient Resources**
   ```bash
   # Check available memory and disk
   docker system df
   docker system prune -a  # Clean up unused resources
   ```

3. **Environment File Issues**
   ```bash
   # Ensure .env file exists and has proper format
   ls -la .env
   cat .env | grep -v "^#" | grep -v "^$"
   ```

### Build Failures

**Symptoms**: Docker build fails with various errors

**Solutions**:

1. **Clear Docker Cache**
   ```bash
   docker-compose build --no-cache
   docker system prune -a
   ```

2. **Check .dockerignore**
   ```bash
   # Ensure .dockerignore files exist
   ls -la backend/.dockerignore
   ls -la frontend/.dockerignore
   ```

3. **BuildKit Issues (macOS/Linux)**
   ```bash
   # Disable BuildKit if causing issues
   export DOCKER_BUILDKIT=0
   docker-compose build
   ```

### Container Connectivity Issues

**Symptoms**: Services can't connect to each other

**Solutions**:

1. **Check Network Configuration**
   ```bash
   docker network ls
   docker network inspect fazopix-network
   ```

2. **Verify Service Dependencies**
   ```bash
   # Restart with proper dependencies
   docker-compose down
   docker-compose up -d postgres redis
   docker-compose up -d backend
   docker-compose up -d frontend
   ```

## Database Issues

### PostgreSQL Connection Failures

**Symptoms**: Backend can't connect to database

**Diagnostics**:
```bash
# Check PostgreSQL container logs
docker-compose logs postgres

# Test database connectivity
docker-compose exec postgres pg_isready -U postgres

# Connect to database directly
docker-compose exec postgres psql -U postgres -d fazopix_dev
```

**Common Solutions**:

1. **Database Not Ready**
   ```bash
   # Wait for database to be fully initialized
   docker-compose logs postgres | grep "database system is ready"
   
   # Check health status
   docker-compose ps postgres
   ```

2. **Wrong Connection String**
   ```bash
   # Verify DATABASE_URL in .env
   grep DATABASE_URL .env
   
   # For Docker mode, should be:
   # DATABASE_URL=postgresql://postgres:dev_password_123@postgres:5432/fazopix_dev
   ```

3. **Permissions Issues**
   ```bash
   # Reset database and recreate
   docker-compose down -v
   docker volume rm fazopix_postgres_data
   docker-compose up -d postgres
   ```

### Migration Issues

**Symptoms**: Prisma migrations fail

**Solutions**:

1. **Reset Migration State**
   ```bash
   docker-compose exec backend npx prisma migrate reset
   docker-compose exec backend npx prisma db push
   ```

2. **Manual Migration**
   ```bash
   docker-compose exec backend npx prisma migrate dev
   docker-compose exec backend npx prisma generate
   ```

3. **Database Schema Issues**
   ```bash
   # Drop and recreate database
   docker-compose exec postgres psql -U postgres -c "DROP DATABASE IF EXISTS fazopix_dev;"
   docker-compose exec postgres psql -U postgres -c "CREATE DATABASE fazopix_dev;"
   docker-compose restart backend
   ```

## Redis Issues

### Redis Connection Failures

**Symptoms**: Backend can't connect to Redis (health check shows Redis disconnected)

**Diagnostics**:
```bash
# Check Redis container
docker-compose logs redis

# Test Redis connectivity
docker-compose exec redis redis-cli ping

# Test with authentication
docker-compose exec redis redis-cli -a dev_redis_password ping
```

**Solutions**:

1. **Redis Not Started**
   ```bash
   docker-compose restart redis
   ```

2. **Authentication Issues**
   ```bash
   # Check REDIS_URL in .env
   grep REDIS_URL .env
   
   # Should be: redis://:dev_redis_password@redis:6379
   ```

3. **Reset Redis Data**
   ```bash
   docker-compose down
   docker volume rm fazopix_redis_data
   docker-compose up -d redis
   ```

## Network Issues

### Frontend Can't Connect to Backend

**Symptoms**: Frontend shows API connection errors

**Solutions**:

1. **Check CORS Configuration**
   ```bash
   # Verify CORS_ORIGIN in .env
   grep CORS_ORIGIN .env
   
   # Should be: http://localhost:3000
   ```

2. **Check Backend Health**
   ```bash
   curl -f http://localhost:3001/health
   curl -f http://localhost:3001/docs
   ```

3. **Network Connectivity**
   ```bash
   # Test from frontend container
   docker-compose exec frontend curl http://backend:3001/health
   ```

### WebSocket Connection Issues

**Symptoms**: Real-time features don't work

**Solutions**:

1. **Check WebSocket URL**
   ```bash
   # Verify NEXT_PUBLIC_WS_URL
   grep NEXT_PUBLIC_WS_URL .env
   
   # Should be: ws://localhost:3001
   ```

2. **Firewall/Proxy Issues**
   ```bash
   # Test WebSocket connection
   wscat -c ws://localhost:3001/ws/bills/test
   ```

## Performance Issues

### Slow Startup

**Common Causes & Solutions**:

1. **Large Build Context**
   ```bash
   # Check .dockerignore files
   ls -la */.dockerignore
   
   # Check build context size
   docker build --progress=plain .
   ```

2. **Resource Constraints**
   ```bash
   # Increase Docker memory (Docker Desktop)
   # macOS/Windows: Docker Desktop > Settings > Resources
   
   # Check container resources
   docker stats
   ```

3. **Volume Mount Performance**
   ```bash
   # Use Docker volumes instead of bind mounts for node_modules
   # This is already configured in docker-compose.yml
   ```

### Hot Reload Not Working

**Symptoms**: Code changes don't trigger automatic reload

**Solutions**:

1. **Backend Hot Reload**
   ```bash
   # Check if tsx is watching files
   docker-compose logs backend | grep "watching"
   
   # Restart backend service
   docker-compose restart backend
   ```

2. **Frontend Hot Reload**
   ```bash
   # Check Next.js development server
   docker-compose logs frontend | grep "ready"
   
   # Verify file changes are detected
   touch frontend/src/app/page.tsx
   docker-compose logs frontend --tail=10
   ```

3. **File System Issues (macOS)**
   ```bash
   # macOS may have file watching issues
   # Add to frontend's next.config.js:
   # module.exports = {
   #   webpack: (config) => {
   #     config.watchOptions = {
   #       poll: 1000,
   #       aggregateTimeout: 300,
   #     }
   #     return config
   #   },
   # }
   ```

## Development Issues

### TypeScript Errors

**Symptoms**: TypeScript compilation errors

**Solutions**:

1. **Shared Types Issues**
   ```bash
   # Ensure shared types are built
   cd shared
   npm run typecheck
   
   # Update type imports in backend/frontend
   ```

2. **Missing Dependencies**
   ```bash
   # Install missing dependencies
   docker-compose exec backend npm install
   docker-compose exec frontend npm install
   
   # Rebuild containers
   docker-compose build --no-cache
   ```

### API Documentation Issues

**Symptoms**: Swagger docs don't load or show errors

**Solutions**:

1. **Check Swagger Setup**
   ```bash
   curl http://localhost:3001/docs
   
   # Check backend logs for Swagger errors
   docker-compose logs backend | grep -i swagger
   ```

2. **Schema Generation Issues**
   ```bash
   # Restart backend service
   docker-compose restart backend
   ```

## Platform-Specific Issues

### macOS Issues

1. **File Permission Issues**
   ```bash
   # Fix ownership issues
   sudo chown -R $(whoami) .
   ```

2. **Docker Desktop Issues**
   ```bash
   # Reset Docker Desktop
   # Docker Desktop > Troubleshoot > Reset to factory defaults
   ```

3. **M1/Apple Silicon Issues**
   ```bash
   # Use arm64 images if available
   # Add platform specification to docker-compose.yml if needed:
   # platform: linux/arm64
   ```

### Linux Issues

1. **Docker Permission Issues**
   ```bash
   # Add user to docker group
   sudo usermod -aG docker $USER
   newgrp docker
   ```

2. **File Watcher Limits**
   ```bash
   # Increase inotify limits
   echo fs.inotify.max_user_watches=524288 | sudo tee -a /etc/sysctl.conf
   sudo sysctl -p
   ```

### Windows/WSL2 Issues

1. **Line Ending Issues**
   ```bash
   # Convert line endings
   git config --global core.autocrlf false
   ```

2. **Performance Issues**
   ```bash
   # Ensure code is in WSL2 filesystem
   # NOT: /mnt/c/...
   # YES: /home/username/...
   ```

## Getting Help

### Collecting Debug Information

When reporting issues, include:

```bash
# System information
docker version
docker-compose version
uname -a

# Service status
docker-compose ps

# Recent logs
docker-compose logs --tail=100 > debug-logs.txt

# Environment configuration (sanitized)
cat .env | sed 's/=.*/=***/' > debug-env.txt
```

### Common Debug Commands

```bash
# Full system reset (DESTRUCTIVE!)
docker-compose down -v
docker system prune -a
docker volume prune
rm -rf node_modules

# Restart specific service
docker-compose restart [service-name]

# Access container shell for debugging
docker-compose exec backend sh
docker-compose exec frontend sh
docker-compose exec postgres psql -U postgres

# Check container resource usage
docker stats

# Check Docker system info
docker system info
```

### Creating Support Tickets

When creating issues, include:

1. **Environment Details**: OS, Docker version, system specs
2. **Steps to Reproduce**: Exact commands run
3. **Expected vs Actual**: What should happen vs what happens
4. **Logs**: Relevant log output (sanitize sensitive data)
5. **Configuration**: Relevant environment variables (sanitized)

### Additional Resources

- **Docker Documentation**: https://docs.docker.com/
- **Docker Compose Documentation**: https://docs.docker.com/compose/
- **Prisma Troubleshooting**: https://www.prisma.io/docs/guides/performance-and-optimization/connection-management
- **Next.js Troubleshooting**: https://nextjs.org/docs/advanced-features/debugging

## Prevention Tips

1. **Regular Maintenance**
   ```bash
   # Clean up weekly
   docker system prune -a
   
   # Update dependencies monthly
   npm update
   ```

2. **Monitor Resources**
   ```bash
   # Set up resource monitoring
   docker stats
   df -h
   ```

3. **Keep Documentation Updated**
   - Document any new issues encountered
   - Share solutions with the team
   - Update this troubleshooting guide