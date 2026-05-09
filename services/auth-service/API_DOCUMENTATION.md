# Auth Service API Documentation

## Overview

The Auth Service API provides user authentication, authorization, and token management for the DevOps Project microservices architecture.

**Base URL**: `http://localhost:8080/auth` (via API Gateway) or `http://localhost:3000` (direct)

## Authentication

The API uses JWT (JSON Web Token) for authentication:
- **Access Token**: Short-lived token (15 minutes) for API requests
- **Refresh Token**: Long-lived token (7 days) for obtaining new access tokens

### Token Usage

Include the access token in the `Authorization` header:
```
Authorization: Bearer <ACCESS_TOKEN>
```

## Error Handling

All error responses follow this format:
```json
{
  "error": "Error Type",
  "details": "Detailed error message"
}
```

### HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `409` - Conflict (duplicate email)
- `500` - Server Error
- `503` - Service Unavailable (database down)

---

## Endpoints

### System Endpoints

#### Health Check
**GET** `/health`

Verify the auth service is running.

**Response** (200):
```
Auth Service is running
```

**Example**:
```bash
curl http://localhost:8080/auth/health
```

---

#### Prometheus Metrics
**GET** `/metrics`

Export metrics for Prometheus monitoring.

**Response** (200):
```
# HELP http_requests_total Total number of requests
# TYPE http_requests_total counter
http_requests_total{method="POST",route="/login",status="200"} 5
```

**Example**:
```bash
curl http://localhost:8080/auth/metrics
```

---

### Authentication Endpoints

#### Register User
**POST** `/register`

Create a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "SecurePassword123",
  "role": "student"
}
```

**Parameters**:
| Field | Type | Required | Constraints | Description |
|-------|------|----------|-------------|-------------|
| email | string | Yes | Valid email format, unique | User email address |
| password | string | Yes | Min 6 characters | User password |
| role | string | Yes | `student`, `instructor`, `admin` | User role |

**Response** (201):
```json
{
  "message": "User registered successfully"
}
```

**Errors**:
- `400` - Missing fields or invalid format
- `409` - Email already registered
- `500` - Server error

**Example**:
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "password123",
    "role": "student"
  }'
```

---

#### Login
**POST** `/login`

Authenticate user and receive JWT tokens.

**Request Body**:
```json
{
  "email": "admin@gmail.com",
  "password": "admin123"
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| email | string | Yes | Registered email address |
| password | string | Yes | User password |

**Response** (200):
```json
{
  "message": "Login successful",
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `400` - Missing email or password
- `401` - Invalid credentials
- `500` - Server error

**Example**:
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@gmail.com",
    "password": "admin123"
  }'
```

**Note**: Save both tokens for subsequent requests.

---

#### Logout
**POST** `/logout`

Invalidate a refresh token and logout user.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | Yes | JWT refresh token to invalidate |

**Response** (200):
```json
{
  "message": "Logged out successfully"
}
```

**Errors**:
- `400` - Missing refresh token
- `500` - Server error

**Example**:
```bash
curl -X POST http://localhost:8080/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

#### Refresh Access Token
**POST** `/refresh`

Get a new access token using a valid refresh token.

**Request Body**:
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Parameters**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| refreshToken | string | Yes | Valid JWT refresh token |

**Response** (200):
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Errors**:
- `400` - Missing or empty refresh token
- `403` - Invalid or expired refresh token
- `500` - Server error

**Example**:
```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }'
```

---

### User Endpoints

#### Get User Profile
**GET** `/profile`

Retrieve authenticated user profile information.

**Headers**:
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response** (200):
```json
{
  "message": "Protected data",
  "user": {
    "userId": 1,
    "role": "admin"
  }
}
```

**Errors**:
- `401` - Missing or invalid token
- `500` - Server error

**Example**:
```bash
curl -X GET http://localhost:8080/auth/profile \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### Role-Based Access Endpoints

#### Admin Resource
**GET** `/admin`

Access restricted to users with `admin` role.

**Headers**:
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response** (200):
```json
{
  "message": "Welcome Admin"
}
```

**Errors**:
- `401` - Missing or invalid token
- `403` - User role is not admin
- `500` - Server error

**Example**:
```bash
curl -X GET http://localhost:8080/auth/admin \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### Instructor Resource
**GET** `/instructor`

Access restricted to users with `instructor` role.

**Headers**:
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response** (200):
```json
{
  "message": "Welcome Instructor"
}
```

**Errors**:
- `401` - Missing or invalid token
- `403` - User role is not instructor
- `500` - Server error

**Example**:
```bash
curl -X GET http://localhost:8080/auth/instructor \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

#### Student Resource
**GET** `/student`

Access restricted to users with `student` role.

**Headers**:
```
Authorization: Bearer <ACCESS_TOKEN>
```

**Response** (200):
```json
{
  "message": "Welcome Student"
}
```

**Errors**:
- `401` - Missing or invalid token
- `403` - User role is not student
- `500` - Server error

**Example**:
```bash
curl -X GET http://localhost:8080/auth/student \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

## Testing Workflow

### 1. Create Test User
```bash
curl -X POST http://localhost:8080/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpass123",
    "role": "student"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser@example.com",
    "password": "testpass123"
  }'
```

Save the `accessToken` and `refreshToken` from response.

### 3. Access Protected Resources
```bash
# Replace <ACCESS_TOKEN> with token from login response
curl -X GET http://localhost:8080/auth/profile \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

### 4. Refresh Token
```bash
curl -X POST http://localhost:8080/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```

### 5. Logout
```bash
curl -X POST http://localhost:8080/auth/logout \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<REFRESH_TOKEN>"
  }'
```

---

## Test Users

Default test users available in the database:

| Email | Password | Role |
|-------|----------|------|
| admin@gmail.com | admin123 | admin |
| instructor@gmail.com | inst123 | instructor |
| student1@gmail.com | stud123 | student |
| student2@gmail.com | stud123 | student |

---

## Token Expiration

| Token Type | Expiration |
|-----------|-----------|
| Access Token | 15 minutes |
| Refresh Token | 7 days |

After an access token expires, use the refresh endpoint with your refresh token to get a new one.

---

## Rate Limiting

The API Gateway applies rate limiting:
- **Limit**: 2 requests per second per IP
- **Burst**: 2 additional requests allowed
- **Response Code**: 429 (Too Many Requests)

Rate limit errors return:
```json
{
  "message": "Too many requests, try again later"
}
```

---

## Security Notes

- Passwords are hashed with bcrypt (10 rounds)
- JWTs are signed with HS256 algorithm
- All endpoints support HTTPS (configure in production)
- Refresh tokens are stored in database for revocation
- User sessions can be revoked via logout

---

## OpenAPI/Swagger

Full API specification is available in `openapi.yml` format.

View in Swagger UI: https://editor.swagger.io/ (upload openapi.yml)

---

## Support

For issues or questions, please refer to the project repository or contact the DevOps team.
