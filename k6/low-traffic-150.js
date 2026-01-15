import http from "k6/http";
import { check, sleep } from "k6";

const ALB_URL =
  "http://digistar-cloud-2-1812869796.ap-southeast-2.elb.amazonaws.com";

// EXTREME TRAFFIC - 150 VUs SHORT BURST
// Expected CPU: 80-95%+ → FORCE AUTO SCALING! 🚀💥
export let options = {
  stages: [
    // Quick warm up
    { duration: "30s", target: 50 },

    // RAPID SPIKE to 150 VUs!
    { duration: "30s", target: 150 },

    // HOLD EXTREME LOAD - 5 minutes at 150 concurrent users
    { duration: "5m", target: 150 },

    // Quick ramp down
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.2"], // Max 20% errors (extreme load)
    http_req_duration: ["p(95)<3000"], // 95% under 3 seconds
  },
};

export default function () {
  // EXTREME LOAD - 150 concurrent users hammering backend

  // 1. Successful login (bcrypt intensive)
  let loginRes = http.post(
    `${ALB_URL}/api/login`,
    JSON.stringify({
      username: "admin",
      password: "admin123",
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  check(loginRes, {
    "request completed": (r) => r.status === 200 || r.status === 401,
  });

  // 2. Failed login (force bcrypt to work harder)
  http.post(
    `${ALB_URL}/api/login`,
    JSON.stringify({
      username: "user" + Math.random().toString(36).substr(2, 9),
      password: "pass" + Math.random().toString(36).substr(2, 9),
    }),
    {
      headers: { "Content-Type": "application/json" },
    }
  );

  // Short sleep for maximum sustained load
  sleep(0.2); // 200ms = 5 req/second per VU × 150 VUs = 750 req/s!
}
