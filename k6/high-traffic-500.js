import http from "k6/http";
import { check, sleep } from "k6";

const ALB_URL =
  "http://digistar-cloud-2-1812869796.ap-southeast-2.elb.amazonaws.com";

// 💥 INSANE MODE - 500 CONCURRENT USERS 💥
// Expected CPU: 100%+ → PAKSA AUTO SCALING SEKARANG!
export let options = {
  stages: [
    // Quick warm up
    { duration: "30s", target: 100 },

    // Ramp to high
    { duration: "30s", target: 200 },

    // 💥 INSANE SPIKE to 500 VUs!
    { duration: "1m", target: 500 },

    // HOLD INSANE LOAD - 6 minutes at 500 concurrent users
    { duration: "6m", target: 500 },

    // Quick ramp down
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.4"], // Allow 40% errors (insane stress)
  },
};

export default function () {
  // INSANE LOAD - 500 concurrent users + 3 requests each

  // 1. Login attempt 1
  http.post(
    `${ALB_URL}/api/login`,
    JSON.stringify({
      username: "admin",
      password: "admin123",
    }),
    {
      headers: { "Content-Type": "application/json" },
      timeout: "10s",
    }
  );

  // 2. Login attempt 2
  http.post(
    `${ALB_URL}/api/login`,
    JSON.stringify({
      username: "admin",
      password: "admin123",
    }),
    {
      headers: { "Content-Type": "application/json" },
      timeout: "10s",
    }
  );

  // 3. Failed login (bcrypt intensive)
  let failRes = http.post(
    `${ALB_URL}/api/login`,
    JSON.stringify({
      username: "insane" + Math.random().toString(36).substr(2, 9),
      password: "extreme" + Math.random().toString(36).substr(2, 9),
    }),
    {
      headers: { "Content-Type": "application/json" },
      timeout: "10s",
    }
  );

  check(failRes, {
    "request attempted": (r) => r !== undefined,
  });

  // Minimal sleep for MAXIMUM load
  // 3 req × 500 VUs / 0.15s = ~10,000 requests/second! 💥💥💥
  sleep(0.15);
}
