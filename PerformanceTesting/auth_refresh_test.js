import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_URL = `${BASE_URL}/auth`;
const VUS = __ENV.VUS ? parseInt(__ENV.VUS, 10) : 1;
const DURATION = __ENV.DURATION || '10m';
const TPH = __ENV.TPH ? parseInt(__ENV.TPH, 10) : 10;
const LOGIN_EMAIL = __ENV.USER_EMAIL || 'admin@gmail.com';
const LOGIN_PASSWORD = __ENV.USER_PASSWORD || 'admin123';
const REGISTER_ROLE = __ENV.USER_ROLE || 'student';
const REGISTER_PASSWORD = __ENV.REGISTER_PASSWORD || 'Password123!';
const ROLE = __ENV.USER_ROLE || 'admin';
const TARGET_ITERATION_SECONDS = (60 * 60 * VUS) / TPH;

export const options = {
  vus: VUS,
  duration: DURATION,
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000', 'p(90)<1500', 'p(80)<1000'],
    checks: ['rate>0.95'],
  },
};

const endpointLatency = new Trend('endpoint_latency', true);
const endpointHits = new Counter('endpoint_hits');
const passCount = new Counter('endpoint_pass_count');
const failCount = new Counter('endpoint_fail_count');
const statusCodeCount = new Counter('endpoint_status_codes');

let accessToken = null;
let refreshToken = null;
let iteration = 0;

function jsonHeaders(token = null) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return { headers };
}

function logStep(endpoint, thinkTime, paceTime, status) {
  console.log(JSON.stringify({
    endpoint,
    users: VUS,
    run: iteration,
    think_time: thinkTime.toFixed(3),
    pace_time: paceTime.toFixed(3),
    status,
  }));
}

function recordMetrics(endpoint, res, success) {
  endpointHits.add(1, { endpoint, status: `${res.status}` });
  statusCodeCount.add(1, { endpoint, status: `${res.status}` });
  if (success) {
    passCount.add(1, { endpoint, status: `${res.status}` });
  } else {
    failCount.add(1, { endpoint, status: `${res.status}` });
  }
  endpointLatency.add(res.timings.duration, { endpoint, status: `${res.status}` });
}

function registerUser(email) {
  const res = http.post(
    `${AUTH_URL}/register`,
    JSON.stringify({ email, password: REGISTER_PASSWORD, role: REGISTER_ROLE }),
    jsonHeaders()
  );

  const success = check(res, {
    'register returned 201 or 409': (r) => r.status === 201 || r.status === 409,
  });

  recordMetrics('register', res, success);
  return success;
}

function loginUser() {
  const res = http.post(
    `${AUTH_URL}/login`,
    JSON.stringify({ email: LOGIN_EMAIL, password: LOGIN_PASSWORD }),
    jsonHeaders()
  );

  const success = check(res, {
    'login returned 200': (r) => r.status === 200,
    'login returned access token': (r) => !!r.json('accessToken'),
    'login returned refresh token': (r) => !!r.json('refreshToken'),
  });

  recordMetrics('login', res, success);

  if (!success) {
    console.error(`Login failed: ${res.status} - ${res.body}`);
    return false;
  }

  accessToken = res.json('accessToken');
  refreshToken = res.json('refreshToken');
  return true;
}

function refreshTokenIfNeeded() {
  const res = http.post(
    `${AUTH_URL}/refresh`,
    JSON.stringify({ refreshToken }),
    jsonHeaders()
  );

  const success = check(res, {
    'refresh returned 200': (r) => r.status === 200,
    'refresh returned access token': (r) => !!r.json('accessToken'),
  });

  recordMetrics('refresh', res, success);

  if (success) {
    accessToken = res.json('accessToken');
  }

  return success;
}

function callApi(method, endpoint, path, body = null, auth = false, expectedStatuses = [200]) {
  const url = `${path.startsWith('/auth') ? BASE_URL : BASE_URL}${path}`;
  const params = auth ? jsonHeaders(accessToken) : jsonHeaders();
  let res;

  if (method === 'GET') {
    res = http.get(url, params);
  } else if (method === 'POST') {
    res = http.post(url, JSON.stringify(body), params);
  } else {
    throw new Error(`Unsupported HTTP method ${method}`);
  }

  let success = expectedStatuses.includes(res.status);
  if (!success && auth && (res.status === 401 || res.status === 403) && refreshToken) {
    if (refreshTokenIfNeeded()) {
      return callApi(method, endpoint, path, body, auth, expectedStatuses);
    }
  }

  recordMetrics(endpoint, res, success);
  return { res, success };
}

export function setup() {
  const randomEmail = `perf_${Math.floor(Math.random() * 100000)}@example.com`;

  // Register a new user
  registerUser(randomEmail);

  // Login with admin account
  if (!loginUser()) {
    throw new Error('Setup failed: Could not login');
  }

  return {
    accessToken,
    refreshToken,
  };
}

export default function (data) {
  iteration += 1;
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;

  const iterationStart = Date.now();

  if (!accessToken || !refreshToken) {
    if (!loginUser()) {
      return;
    }
  }

  group('Complete API workflow', () => {
    // Health check - no auth required
    const health = callApi('GET', 'health', '/health', null, false, [200]);

    // Metrics - no auth required
    const metrics = callApi('GET', 'metrics', '/auth/metrics', null, false, [200]);

    // Profile - requires auth
    const profile = callApi('GET', 'profile', '/auth/profile', null, true, [200]);

    // Role-based endpoint
    const roleRoute = ROLE === 'admin' ? 'admin' : ROLE === 'instructor' ? 'instructor' : 'student';
    const roleResult = callApi('GET', roleRoute, `/auth/${roleRoute}`, null, true, [200]);

    // Refresh token
    refreshTokenIfNeeded();

    // Logout
    const logoutResult = callApi('POST', 'logout', '/auth/logout', { refreshToken }, false, [200]);

    if (logoutResult.success) {
      accessToken = null;
      refreshToken = null;
    }

    const thinkTime = 2 + Math.random();
    const elapsed = (Date.now() - iterationStart) / 1000;
    const paceTime = Math.max(0, TARGET_ITERATION_SECONDS - elapsed - thinkTime);

    logStep('health', thinkTime, paceTime, health.res ? health.res.status : 0);
    logStep('metrics', thinkTime, paceTime, metrics.res ? metrics.res.status : 0);
    logStep('profile', thinkTime, paceTime, profile.res ? profile.res.status : 0);
    logStep(roleRoute, thinkTime, paceTime, roleResult.res ? roleResult.res.status : 0);

    sleep(thinkTime);
    if (paceTime > 0) {
      sleep(paceTime);
    }
  });
}

export function handleSummary(data) {
  const reportText = textSummary(data, { indent: '  ' });
  const latency = data.metrics['http_req_duration'] ? data.metrics['http_req_duration'].values : {};
  const hits = data.metrics['http_reqs'] ? data.metrics['http_reqs'].values.count : 0;
  const passes = data.metrics['endpoint_pass_count'] ? data.metrics['endpoint_pass_count'].values.count : 0;
  const fails = data.metrics['endpoint_fail_count'] ? data.metrics['endpoint_fail_count'].values.count : 0;

  const customReport = [];
  customReport.push('=== Performance Test Summary ===');
  customReport.push(`95% latency: ${latency['p(95)'] || 'n/a'} ms`);
  customReport.push(`90% latency: ${latency['p(90)'] || 'n/a'} ms`);
  customReport.push(`80% latency: ${latency['p(80)'] || 'n/a'} ms`);
  customReport.push(`avg latency: ${latency.avg || 'n/a'} ms`);
  customReport.push(`number of hits: ${hits}`);
  customReport.push(`pass count: ${passes}`);
  customReport.push(`fail count: ${fails}`);

  const statusMetrics = Object.keys(data.metrics)
    .filter((key) => key.startsWith('endpoint_status_codes'))
    .map((key) => `${key}: ${JSON.stringify(data.metrics[key].values)}`);

  if (statusMetrics.length) {
    customReport.push('response code breakdown:');
    customReport.push(...statusMetrics);
  }

  const summaryBody = `${customReport.join('\n')}\n\n${reportText}`;

  return {
    'PerformanceTesting/perf-summary.txt': summaryBody,
    'PerformanceTesting/perf-summary.json': JSON.stringify(data, null, 2),
  };
}
