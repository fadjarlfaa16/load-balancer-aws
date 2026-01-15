import http from "k6/http";
import { check, sleep } from "k6";

const ALB_URL =
  "http://digistar-cloud-2-1812869796.ap-southeast-2.elb.amazonaws.com";

// 🔥 EXTREME TRAFFIC - 300 CONCURRENT USERS 🔥
// Expected CPU: 90-100%+ → FORCE AUTO SCALING IMMEDIATELY!
export let options = {
  stages: [
    // Quick warm up
    { duration: "30s", target: 50 },

    // Ramp to high
    { duration: "30s", target: 100 },

    // 🚀 EXTREME SPIKE to 300 VUs!
    { duration: "1m", target: 300 },

    // HOLD EXTREME LOAD - 5 minutes at 300 concurrent users
    { duration: "5m", target: 300 },

    // Quick ramp down
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.3"], // Allow 30% errors (extreme stress)
  },
};

export default function () {
  // EXTREME LOAD - 300 concurrent users hammering backend

  // 1. Successful login (bcrypt intensive)
  let loginRes = http.post(
    `${ALB_URL}/api/login`,
    JSON.stringify({
      username: "admin",
      password: "admin123",
    }),
    {
      headers: { "Content-Type": "application/json" },
      timeout: "5s",
    }
  );

  check(loginRes, {
    "request completed": (r) => r.status === 200 || r.status === 401,
  });

  // 2. Failed login (force bcrypt to work harder)
  http.post(
    `${ALB_URL}/api/login`,
    JSON.stringify({
      username: "stress" + Math.random().toString(36).substr(2, 9),
      password: "test" + Math.random().toString(36).substr(2, 9),
    }),
    {
      headers: { "Content-Type": "application/json" },
      timeout: "5s",
    }
  );

  // Short sleep for maximum sustained load
  // 2 req × 300 VUs / 0.2s = ~3000 requests/second! 💥
  sleep(0.2);
}
