# Performance Testing

This folder contains a K6 performance test script that covers the auth service APIs, handles login/refresh/logout flow, records pass/fail counts, and generates a report.

## Files

- `auth_refresh_test.js` - K6 script that tests all auth service endpoints:
  - `GET /auth/health`
  - `GET /auth/metrics`
  - `POST /auth/login`
  - `GET /auth/profile`
  - `GET /auth/admin` or role-specific endpoint
  - `POST /auth/refresh`
  - `POST /auth/logout`
  - `POST /auth/register` (setup)

## Behavior

- Uses `VUS=1` by default
- Randomized think time between 2 and 3 seconds
- Automatically computes pace time based on `TPH` and `VUS`
- Generates a detailed `perf-summary.txt` and `perf-summary.json`
- Logs each endpoint with:
  - endpoint
  - number of users
  - run iteration
  - think time
  - pace time
  - HTTP status

## Usage

1. Install K6:

```bash
# macOS / Linux
brew install k6

# Windows (Chocolatey)
choco install k6
```

2. Run the script:

```bash
cd "d:\git projects\Devops_Project"
k6 run PerformanceTesting/auth_refresh_test.js
```

3. Override defaults with environment variables:

```bash
set BASE_URL=http://localhost:8080
set USER_EMAIL=admin@gmail.com
set USER_PASSWORD=admin123
set USER_ROLE=admin
set VUS=1
set DURATION=10m
set TPH=10
set REGISTER_ROLE=student
set REGISTER_PASSWORD=Password123!
k6 run PerformanceTesting/auth_refresh_test.js
```

## Supported environment variables

- `BASE_URL` - Base host for the gateway, default `http://localhost:8080`
- `USER_EMAIL` - Login email for the auth service (default `admin@gmail.com`)
- `USER_PASSWORD` - Login password for the auth service (default `admin123`)
- `USER_ROLE` - Role endpoint to validate (`admin`, `instructor`, `student`)
- `VUS` - Number of virtual users (default `1`)
- `DURATION` - Test duration, e.g. `10m` (default `10m`)
- `TPH` - Target throughput per hour (default `10`)
- `REGISTER_ROLE` - Role used for the setup registration user
- `REGISTER_PASSWORD` - Password used for the setup registration user

## Report files

- `PerformanceTesting/perf-summary.txt`
- `PerformanceTesting/perf-summary.json`

## Notes

- The script runs through all main auth service endpoints and keeps the session alive with refresh tokens.
- `logout` is executed after refresh to verify the full token lifecycle.
- For CI, use the provided Jenkins stage so the performance script runs automatically after deployment.
