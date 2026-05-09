# Environment Separation Guide

This project supports multiple environments with distinct configurations and deployments.

## Environments

### Development (`.env.dev`)
**Purpose**: Local development on your machine

**Features**:
- Debug logging enabled
- Hot-reload support
- Minimal security (default credentials)
- Fast iteration
- Local PostgreSQL container

**Startup**:
```bash
# Using the dev compose file
docker-compose -f docker-compose.dev.yml up -d

# Or use default (maps to dev)
docker-compose up -d
```

**Characteristics**:
- `LOG_LEVEL=debug` - Verbose logging
- `NODE_ENV=development`
- Database: `udemy_devops` (default credentials)
- Port mapping: All ports exposed

---

### Staging (`.env.staging`)
**Purpose**: Pre-production testing and validation

**Features**:
- Production-like configuration
- Enhanced monitoring
- Real alert management
- Performance testing
- Full test data

**Startup**:
```bash
docker-compose -f docker-compose.staging.yml up -d
```

**Characteristics**:
- `LOG_LEVEL=info` - Normal logging
- `NODE_ENV=staging`
- Database: `udemy_devops_staging` (separate database)
- Alpine images for smaller footprint
- AlertManager included
- Stricter health checks (5s intervals)
- Auto-restart policy

---

### Production (`.env.prod`)
**Purpose**: Live production deployment

**Features**:
- High availability (replicated services)
- Resource limits (CPU/memory)
- Auto-scaling ready
- Minimal logging (warn only)
- External secret management
- No debug endpoints

**Startup** (Docker Swarm):
```bash
docker stack deploy -c docker-compose.prod.yml auth-service
```

**Characteristics**:
- `LOG_LEVEL=warn` - Only warnings/errors
- `NODE_ENV=production`
- Database: User-defined via environment
- Multiple replicas (3x auth-service, 2x api-gateway)
- Rolling updates (parallel: 1)
- Resource limits enforced
- Secrets from Docker Swarm external store
- Data retention: 90 days (Prometheus)

---

## Configuration Comparison

| Aspect | Dev | Staging | Prod |
|--------|-----|---------|------|
| **Log Level** | debug | info | warn |
| **CORS** | enabled | disabled | disabled |
| **Debug Logging** | yes | no | no |
| **Replicas** | 1 | 1 | 3 (auth), 2 (gateway) |
| **Memory Limit** | none | none | 512M/container |
| **CPU Limit** | none | none | 1 core/container |
| **Auto Restart** | no | yes | yes |
| **Health Check Interval** | 10s | 5s | 5s |
| **Secrets Management** | files | files | Docker/Vault |
| **Data Retention** | none | 30 days | 90 days |

---

## Environment Variables

### Common Variables
```bash
NODE_ENV              # development, staging, production
PORT                  # Service port (default: 3000)
LOG_LEVEL            # debug, info, warn, error
LOG_FORMAT           # json (for ELK integration)
```

### Database Variables
```bash
DB_HOST              # PostgreSQL hostname
DB_USER              # Database user
DB_PASSWORD          # Database password
DB_NAME              # Database name
DB_PORT              # Database port
DB_SSL               # Enable SSL (staging/prod)
DB_POOL_SIZE         # Connection pool size
```

### JWT/Security Variables
```bash
JWT_SECRET           # Access token secret
JWT_REFRESH_SECRET   # Refresh token secret
HTTPS_ONLY          # Force HTTPS (prod only)
CSRF_PROTECTION     # Enable CSRF protection
RATE_LIMIT_*        # Rate limiting configuration
```

### Monitoring Variables
```bash
SENTRY_DSN          # Error tracking service
DATADOG_API_KEY     # Monitoring/APM
PROMETHEUS_URL      # Prometheus endpoint
GRAFANA_URL         # Grafana dashboard
```

---

## Switching Environments

### Start Development
```bash
# Option 1: Use dev compose file
docker-compose -f docker-compose.dev.yml up -d

# Option 2: Default (dev setup)
docker-compose up -d
```

### Start Staging
```bash
docker-compose -f docker-compose.staging.yml up -d
```

### Start Production
```bash
# Create Docker Swarm
docker swarm init

# Create secrets
docker secret create jwt_secret - < services/auth-service/secrets/jwt_secret.txt
docker secret create jwt_refresh_secret - < services/auth-service/secrets/jwt_refresh_secret.txt

# Deploy stack
docker stack deploy -c docker-compose.prod.yml auth-service
```

---

## Managing Environment-Specific Files

### Adding a New Environment Variable

1. **Add to all `.env.*` files**:
   ```bash
   # Add to .env.dev, .env.staging, .env.prod
   NEW_VAR=value_for_environment
   ```

2. **Update docker-compose files** if needed:
   ```yaml
   environment:
     NEW_VAR: ${NEW_VAR}
   ```

3. **Document the variable** in this file

### Creating a New Environment

1. **Create `.env.custom`**:
   ```bash
   cp services/auth-service/.env.staging services/auth-service/.env.custom
   # Edit with custom values
   ```

2. **Create `docker-compose.custom.yml`**:
   ```bash
   cp docker-compose.staging.yml docker-compose.custom.yml
   # Adjust as needed
   ```

3. **Deploy**:
   ```bash
   docker-compose -f docker-compose.custom.yml up -d
   ```

---

## Environment-Specific Secrets

### Development
```bash
# Use insecure defaults from .env.dev
JWT_SECRET=dev_access_secret_change_in_prod
JWT_REFRESH_SECRET=dev_refresh_secret_change_in_prod
```

### Staging
```bash
# Create staging-specific secrets
echo "staging_access_secret_min_32_chars_required" > services/auth-service/secrets/jwt_secret_staging.txt
echo "staging_refresh_secret_min_32_chars_required" > services/auth-service/secrets/jwt_refresh_secret_staging.txt
```

### Production
```bash
# Use Docker Swarm secrets
docker secret create jwt_secret - < /path/to/prod/secret
docker secret create jwt_refresh_secret - < /path/to/prod/secret

# OR use environment variables from CI/CD
export JWT_SECRET=$(aws secretsmanager get-secret-value --secret-id auth-jwt-secret)
```

---

## Debugging Environment Issues

### Check Active Configuration
```bash
# View environment variables in running container
docker exec auth-service env | grep -E "NODE_ENV|LOG_LEVEL|JWT"

# View compose file being used
docker-compose config

# View secrets (staging/dev only)
cat services/auth-service/secrets/jwt_secret.txt
```

### View Logs by Environment
```bash
# Development
docker-compose -f docker-compose.dev.yml logs -f auth-service

# Staging
docker-compose -f docker-compose.staging.yml logs -f auth-service

# Production
docker service logs auth-service_auth-service -f
```

### Verify Configuration
```bash
# Check database connection
docker exec auth-service curl -s http://localhost:3000/health

# Check if using correct secret
docker exec auth-service env | grep JWT_SECRET

# Verify log format
docker logs auth-service | head -5
```

---

## Best Practices

### ✅ DO:
- Use separate databases for each environment
- Rotate secrets regularly
- Test configuration changes in staging first
- Use strong secrets (32+ characters)
- Document environment-specific differences
- Use `.gitignore` to exclude `.env.*` files
- Version control only `.env.example`

### ❌ DON'T:
- Use same secrets across environments
- Commit real secrets to version control
- Skip staging before production deployment
- Use hardcoded credentials in code
- Mix environment configurations
- Keep outdated environment files

---

## Migration Guide

### From Single Config to Multi-Environment

1. **Create environment-specific files**:
   ```bash
   mv .env .env.dev
   cp .env.dev .env.staging
   cp .env.dev .env.prod
   ```

2. **Update docker-compose files**:
   ```bash
   mv docker-compose.yml docker-compose.dev.yml
   # Create staging and prod versions
   ```

3. **Update documentation**:
   - Add environment selection instructions
   - Document variable differences
   - Create per-environment guides

4. **Update CI/CD**:
   - Add environment-specific deploy steps
   - Use appropriate compose files per stage

---

## References

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Environment Variables Best Practices](https://12factor.net/config)
- [Docker Secrets Management](https://docs.docker.com/engine/swarm/secrets/)
- [Kubernetes ConfigMaps and Secrets](https://kubernetes.io/docs/concepts/configuration/)
