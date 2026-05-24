
import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';
import { textSummary } from 'https://jslib.k6.io/k6-summary/0.0.1/index.js';
import { calculateThinkAndPaceTime } from './think_pace.js';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const AUTH_URL = `${BASE_URL}/auth`;
const HEALTH_URL = 'http://localhost:3002/health';
const VUS = __ENV.VUS ? parseInt(__ENV.VUS, 10) : 1;
const DURATION = __ENV.DURATION || '10m';
const TPH = __ENV.TPH ? parseInt(__ENV.TPH, 10) : 10;
const REGISTER_ROLE = __ENV.USER_ROLE || 'student';
const REGISTER_PASSWORD = 'Password123!';
const ROLE = __ENV.USER_ROLE || 'student';

// Calculate think and pace time using Little's Law
const { thinkTime: DEFAULT_THINK_TIME, paceTime: DEFAULT_PACE_TIME, targetIterationSeconds: TARGET_ITERATION_SECONDS } = calculateThinkAndPaceTime(TPH, VUS);

let testUserEmail = null;
let testUserPassword = REGISTER_PASSWORD;

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

function loginUser(email = null, password = null) {
  const loginEmail = email || testUserEmail;
  const loginPassword = password || testUserPassword;
  const res = http.post(
    `${AUTH_URL}/login`,
    JSON.stringify({ email: loginEmail, password: loginPassword }),
    jsonHeaders()
  );
  // Use regex to extract tokens if not present in JSON
  let access = res.json('accessToken');
  let refresh = res.json('refreshToken');
  if (!access || !refresh) {
    // fallback: try regex
    const matchAccess = /"accessToken"\s*:\s*"([^"]+)"/.exec(res.body);
    const matchRefresh = /"refreshToken"\s*:\s*"([^"]+)"/.exec(res.body);
    access = access || (matchAccess ? matchAccess[1] : null);
    refresh = refresh || (matchRefresh ? matchRefresh[1] : null);
  }
  const success = check(res, {
    'login returned 200': (r) => r.status === 200,
    'login returned access token': () => !!access,
    'login returned refresh token': () => !!refresh,
  });
  recordMetrics('login', res, success);
  if (!success) {
    console.error(`Login failed: ${res.status} - ${res.body}`);
    return false;
  }
  accessToken = access;
  refreshToken = refresh;
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
  testUserEmail = `perf_${Math.floor(Math.random() * 1000000)}@example.com`;

  console.log(`Setting up test user: ${testUserEmail}`);

  // Register the new user
  const registerRes = http.post(
    `${AUTH_URL}/register`,
    JSON.stringify({ email: testUserEmail, password: testUserPassword, role: REGISTER_ROLE }),
    jsonHeaders()
  );

  const registerSuccess = check(registerRes, {
    'register returned 201 or 409': (r) => r.status === 201 || r.status === 409,
  });

  if (!registerSuccess) {
    console.error(`Registration failed: ${registerRes.status} - ${registerRes.body}`);
  }

  // Login with the same user
  if (!loginUser(testUserEmail, testUserPassword)) {
    throw new Error('Setup failed: Could not login with registered user');
  }

  console.log(`Setup complete. Test user: ${testUserEmail}`);

  return {
    accessToken,
    refreshToken,
    testUserEmail,
  };
}

export default function (data) {
  iteration += 1;
  accessToken = data.accessToken;
  refreshToken = data.refreshToken;
  testUserEmail = data.testUserEmail;

  const iterationStart = Date.now();

  if (!accessToken || !refreshToken) {
    if (!loginUser(testUserEmail, testUserPassword)) {
      return;
    }
  }

  group('Complete API workflow', () => {
    // 1. Auth health check
    const healthRes = http.get(HEALTH_URL);
    const healthSuccess = check(healthRes, {
      'health returned 200': (r) => r.status === 200,
    });
    recordMetrics('health', healthRes, healthSuccess);

    // 2. Register (should be done in setup, but for sequence completeness)
    // Skipped here, as user is already registered in setup

    // 3. Login (already done, but can be re-tested if needed)
    // loginUser(testUserEmail, testUserPassword);

    // 4. Profile
    const profile = callApi('GET', 'profile', '/auth/profile', null, true, [200]);

    // 5. Role-based endpoint
    const roleRoute = ROLE === 'admin' ? 'admin' : ROLE === 'instructor' ? 'instructor' : 'student';
    const roleResult = callApi('GET', roleRoute, `/auth/${roleRoute}`, null, true, [200]);

    // 6. Refresh token
    refreshTokenIfNeeded();

    // 7. Logout
    const logoutResult = callApi('POST', 'logout', '/auth/logout', { refreshToken }, false, [200]);
    if (logoutResult.success) {
      accessToken = null;
      refreshToken = null;
    }

    // Use calculated think and pace time
    const thinkTime = DEFAULT_THINK_TIME + Math.random();
    const elapsed = (Date.now() - iterationStart) / 1000;
    const paceTime = Math.max(0, TARGET_ITERATION_SECONDS - elapsed - thinkTime);

    logStep('health', thinkTime, paceTime, healthRes ? healthRes.status : 0);
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
