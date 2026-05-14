# DevOps Project - Authentication Service

A complete microservices-based authentication system with API Gateway, Prometheus monitoring, and Grafana visualization. This project demonstrates DevOps practices including containerization, CI/CD pipelines, and observability.

## 📋 Project Overview

This project includes:
- **Auth Service**: Node.js/Express authentication microservice with JWT tokens, role-based access control, and metrics
- **API Gateway**: Nginx reverse proxy with rate limiting
- **Database**: PostgreSQL for user and refresh token storage
- **Monitoring**: Prometheus metrics collection and Grafana dashboards
- **Node Exporter**: System metrics collection
- **Jenkins CI/CD**: Automated build and deployment pipeline

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Application                        │
└────────────────────────┬────────────────────────────────────┘
                         │
                    Port 8080
                         │
            ┌────────────▼────────────┐
            │   API Gateway (Nginx)   │
            │   Rate Limiting         │
            └────────────┬────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
    Port 3000        Port 9090        Port 3001
        │                │                │
  ┌─────▼──────┐  ┌──────▼────────┐  ┌──▼──────────┐
  │ Auth Service│  │  Prometheus   │  │  Grafana    │
  │ (Port 3000) │  │  (Port 9090)  │  │ (Port 3001) │
  └─────┬──────┘  └───────────────┘  └─────────────┘
        │
    Port 5433
        │
    ┌───▼──────────────┐
    │   PostgreSQL     │
    │ (Port 5433)      │
    └──────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 14+ (optional, for local development)
- Git

### Available Docker Compose Files

- **`docker-compose.yml`** - Default development configuration
- **`docker-compose.prod.yml`** - Production deployment (used by Jenkins pipeline)
- **`docker-compose.staging.yml`** - Staging environment
- **`docker-compose.dev.yml`** - Development environment
- **`docker-compose.test.yml`** - Testing environment

### Installation & Startup

1. **Clone the repository**
```bash
git clone <repository-url>
cd Devops_Project
```

2. **Start all services (Development)**
```bash
docker-compose up -d --build
```

**For Production Deployment** (via Jenkins):
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

3. **Verify all containers are running**
```bash
docker-compose ps
```

Expected output:
```
CONTAINER ID   IMAGE                                    STATUS
xxxx           postgres:15                              Up
xxxx           khaja7289/devops-project-pipeline:...    Up
xxxx           khaja7289/devops-project-pipeline:...    Up
xxxx           khaja7289/devops-project-pipeline:...    Up
xxxx           grafana/grafana                          Up
xxxx           prom/node-exporter                       Up
```

## 📚 Documentation

- **[API Documentation](./services/auth-service/API_DOCUMENTATION.md)** - Complete API endpoint reference
- **[OpenAPI Spec](./services/auth-service/openapi.yml)** - Swagger/OpenAPI specification
- **[Testing Guide](#-testing--verification)** - Below in this file

### Auth Service
**Purpose**: User authentication and authorization
**Port**: 3000 (internal), 8080 (via gateway)
**Features**:
- User registration with password hashing (bcrypt)
- JWT-based authentication (access + refresh tokens)
- Role-based access control (admin, instructor, student)
- Metrics endpoint for Prometheus

**Key Files**:
- `services/auth-service/index.js` - Main application
- `services/auth-service/middleware/authMiddleware.js` - Token validation
- `services/auth-service/middleware/roleMiddleware.js` - Role checking
- `services/auth-service/init.sql` - Database schema

### API Gateway (Nginx)
**Purpose**: Single entry point with rate limiting
**Port**: 8080
**Features**:
- Reverse proxy to auth service
- Rate limiting (2 requests/second)
- Request logging
- 429 error handling

### Database (PostgreSQL)
**Port**: 5433
**Database**: `udemy_devops`
**Credentials**: 
- User: `postgres`
- Password: `postgres`

**Tables**:
- `users` - User accounts with email, hashed password, and role
- `refresh_tokens` - Valid refresh tokens for session management

### Monitoring Stack
- **Prometheus** (Port 9090): Metrics collection and storage
- **Grafana** (Port 3001): Visualization and dashboards
- **Node Exporter** (Port 9101): System-level metrics

## 🧪 Testing & Verification

### 1. Health Check
```bash
curl http://localhost:8080/auth/health
```
Expected response:
```
Auth Service is running
```

### 2. Database Verification - Users Table
```bash
docker exec postgres psql -U postgres -d udemy_devops -c "SELECT * FROM users;"
```
Expected: Lists all registered users

### 3. Database Verification - Refresh Tokens Table
```bash
docker exec postgres psql -U postgres -d udemy_devops -c "SELECT * FROM refresh_tokens;"
```
Expected: Shows valid refresh tokens after login

### 4. User Registration Test
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@gmail.com",
    "password": "password123",
    "role": "student"
  }'
```
Expected response:
```json
{"message": "User registered successfully"}
```

### 5. User Login Test
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmail.com",
    "password": "admin123"
  }'
```
Expected response (save tokens):
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci..."
}
```

### 6. Protected Route Test (Admin)
```bash
curl -X GET http://localhost:8080/auth/admin \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
Expected:
```json
{"message": "Welcome Admin"}
```

### 7. Protected Route Test (Instructor)
```bash
curl -X GET http://localhost:8080/auth/instructor \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
Expected:
```json
{"message": "Welcome Instructor"}
```

### 8. Protected Route Test (Student)
```bash
curl -X GET http://localhost:8080/auth/student \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
Expected:
```json
{"message": "Welcome Student"}
```

### 9. Get User Profile
```bash
curl -X GET http://localhost:8080/auth/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```
Expected response:
```json
{
  "message": "Protected data",
  "user": {
    "userId": 1,
    "role": "admin"
  }
}
```

### 10. Refresh Token Test
```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```
Expected response:
```json
{
  "accessToken": "eyJhbGci..."
}
```

### 11. Logout Test
```bash
curl -X POST http://localhost:8080/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```
Expected response:
```json
{"message": "Logged out successfully"}
```

### 12. Metrics Endpoint
```bash
curl http://localhost:8080/auth/metrics
```
Expected: Prometheus metrics in text format

### 13. Rate Limiting Test
Run 3+ requests in rapid succession:
```bash
for i in {1..5}; do curl http://localhost:8080/auth/health; echo; done
```
Expected: After 2 requests, get rate limit response:
```json
{"message":"Too many requests, try again later"}
```

## 📊 Monitoring & Dashboards

### Prometheus
**URL**: http://localhost:9090

Useful queries:
```promql
# HTTP request rate
rate(http_requests_total[1m])

# Request status codes
http_requests_total{job="auth-service"}

# System CPU usage
node_cpu_seconds_total{job="node-exporter"}
```

### Grafana
**URL**: http://localhost:3001
**Default Credentials**: 
- Username: `admin`
- Password: `admin`

To add Prometheus data source:
1. Go to Configuration → Data Sources
2. Add Prometheus
3. URL: `http://prometheus:9090`

## 🔄 CI/CD Pipeline (Jenkins)

### Main Pipeline (Jenkinsfile - PRODUCTION DEPLOYMENT)

The main Jenkinsfile automates production deployment with the following stages:

**Active Stages** (Production Deployment Only):
1. **Clean** - Cleans workspace
2. **Checkout** - Pulls latest code
3. **Debug Files** - Lists project structure
4. **Create Secrets** - Sets up JWT secrets
5. **Docker Build & Push** - Builds and pushes Docker images to registry
6. **Build & Deploy** - Deploys using `docker-compose.prod.yml`
7. **Database Migrations** - Verifies Flyway migrations
8. **Verify Users DB** - Checks users table
9. **Verify Refresh Tokens DB** - Checks refresh_tokens table
10. **Health Checks** - Validates all services are healthy
11. **Test Summary** - Displays deployment summary

**Commented Out** (Use separate pipelines):
- ❌ Unit Tests → Run locally or in CI before deployment
- ❌ Lint & Code Quality → Run locally before commits
- ❌ API Integration Tests → Can be enabled as optional stage
- ❌ Performance Tests → Use JenkinsPT pipeline instead
- ❌ Database Backup → Configure separately if needed

### Running Jenkins Pipeline
```bash
# Trigger pipeline (requires Jenkins setup)
# The pipeline automatically runs on git push to main branch
# Uses docker-compose.prod.yml for production deployment
```

---

### Performance Testing Pipeline (JenkinsPT)

Create a separate Jenkins pipeline job pointing to `JenkinsPT` file for performance testing.

**Stages**:
1. **Clean** - Clears workspace
2. **Checkout** - Pulls latest code
3. **Pre-Test Setup** - Verifies services are running
4. **Auth Refresh Test** - Runs K6 performance tests
5. **Performance Analysis** - Parses test results
6. **Generate Report** - Creates HTML performance report
7. **Archive Results** - Archives test artifacts

**Configuration** (Customizable via environment variables):
```bash
BASE_URL=http://localhost:8080
USER_EMAIL=admin@gmail.com
USER_PASSWORD=admin123
USER_ROLE=admin
VUS=5                    # Virtual Users
DURATION=5m              # Test Duration
TPH=50                   # Throughput (requests/hour)
```

**Setup**:
1. Create new Jenkins pipeline job
2. Point to repository URL
3. Set script path: `JenkinsPT`
4. Configure build triggers as needed
5. Run pipeline for performance metrics

## 🛑 Stopping Services

```bash
docker-compose down
```

To remove volumes as well:
```bash
docker-compose down -v
```

## 📝 Environment Variables

Set in `services/auth-service/.env`:
```
DB_HOST=postgres
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=udemy_devops
DB_PORT=5432
PORT=3000
JWT_SECRET=access_secret
JWT_REFRESH_SECRET=refresh_secret
```

## 🧪 Running Tests

**Note**: Unit and integration tests are run locally during development. The Jenkins pipeline (`Jenkinsfile`) focuses on production deployment only. Tests should be run before committing code.

### Local Testing
```bash
cd services/auth-service

# Install dependencies
npm install

# Run unit tests
npm test

# Run integration tests (requires docker-compose.test.yml)
npm run test:integration

# Run all tests (unit + integration)
npm run test:all

# Watch mode (re-run on file changes)
npm run test:watch

# Generate coverage report
npm run test:coverage
```

**Test Coverage**:
- 30+ unit tests
- 15+ integration tests with real database
- Full validation, error handling, and API endpoint coverage

## 🔐 Secrets Management

Sensitive credentials are managed securely:

**File**: `services/auth-service/secrets/`
- JWT secrets stored separately from source code
- Excluded from version control via `.gitignore`
- Used via Docker secrets in production

For configuration details, see: [`services/auth-service/secrets/README.md`](./services/auth-service/secrets/README.md)

## 📦 Database Migrations

Database schema is version-controlled using Flyway:

**Location**: `services/auth-service/migrations/`
- Each migration file is numbered and versioned
- Migrations run automatically on container startup
- Full migration history tracked in database

**Migration Files**:
- `V1__Create_users_table.sql` - Users table setup
- `V2__Create_refresh_tokens_table.sql` - Refresh tokens table
- `V3__Insert_test_users.sql` - Test data

To add a new migration:
```bash
# Create new migration file following naming convention
touch services/auth-service/migrations/V4__Your_description.sql

# Restart services (Flyway runs automatically)
docker-compose down
docker-compose up -d --build
```

For detailed migration guide, see: [`services/auth-service/migrations/README.md`](./services/auth-service/migrations/README.md)

## 🔄 CI/CD Pipeline

The Jenkins pipeline now includes:

**Test Stages**:
1. ✅ Unit tests (validation, error handling, API endpoints)
2. ✅ Code quality checks (ESLint-ready)
3. ✅ Integration tests with real database
4. ✅ API health checks
5. ✅ Database verification
6. ✅ Service health monitoring

**Pipeline Stages**:
- Clean workspace
- Checkout code
- Run unit tests
- Create secrets
- Build & deploy containers
- Run database migrations
- Verify database tables
- Check service health
- Run API integration tests
- Create database backup
- Generate test summary

**Jenkinsfile**: `./Jenkinsfile`

To manually test the pipeline:
```bash
# Run pipeline locally
docker-compose down || true
docker-compose up -d --build
sleep 15

# Test health endpoints
curl http://localhost:8080/auth/health
curl http://localhost:9090/-/healthy
curl http://localhost:3001/api/health
```

## ❤️ Health Checks

All services include health checks for auto-recovery:

```yaml
Services monitored:
- PostgreSQL: pg_isready check
- Auth Service: /health endpoint
- API Gateway: /auth/health endpoint
- Prometheus: /-/healthy endpoint
- Grafana: /api/health endpoint
- Node Exporter: /metrics endpoint
```

Health checks enable:
- Automatic container restart on failure
- Orchestration with Kubernetes
- Load balancer integration
- Service dependency management

## 🔐 Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- JWT tokens expire: access (15m), refresh (7d)
- Refresh tokens stored in database for revocation
- Rate limiting prevents brute force attacks
- Role-based access control for resource protection

## 📦 Dependencies

**Auth Service**:
- express ^5.2.1
- pg ^8.20.0
- bcrypt ^6.0.0
- jsonwebtoken ^9.0.3
- dotenv ^17.4.2
- morgan ^1.10.1
- prom-client ^15.1.3

## 🧩 Project Structure

```
Devops_Project/
├── services/
│   └── auth-service/
│       ├── index.js                 # Main application
│       ├── middleware/
│       │   ├── authMiddleware.js    # JWT verification
│       │   └── roleMiddleware.js    # Role validation
│       ├── package.json
│       ├── init.sql                 # Database schema
│       └── .env                     # Configuration (not in repo)
├── gateway/
│   ├── Dockerfile
│   └── nginx.conf                   # Rate limiting & routing
├── prometheus/
│   ├── Dockerfile
│   └── prometheus.yml               # Scrape config
├── docker-compose.yml               # Service orchestration
├── Jenkinsfile                      # CI/CD pipeline
├── Jenkins.Dockerfile               # Jenkins container
└── README.md                         # This file
```

## 🐛 Troubleshooting

### Containers not starting
```bash
# Check logs
docker-compose logs auth-service
docker-compose logs postgres

# Rebuild containers
docker-compose down
docker-compose up -d --build
```

### Database connection error
```bash
# Wait for database to initialize
sleep 15

# Check database
docker exec postgres psql -U postgres -d udemy_devops -c "SELECT 1;"
```

### Cannot connect to API
- Ensure API Gateway is running: `docker-compose ps`
- Check port 8080 is available
- Verify auth-service logs: `docker-compose logs auth-service`

### Rate limiting issues
- Check if running multiple requests from same IP
- Adjust limit in `gateway/nginx.conf` if needed

## 📞 Support & Contribution

For issues, questions, or contributions, please refer to the project repository.

## 📄 License

ISC

---

**Last Updated**: May 2026
**Version**: 1.1.0
**Pipeline Update**: Production-only CI/CD pipeline with separate Performance Testing pipeline
