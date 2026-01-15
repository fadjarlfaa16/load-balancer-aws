import http from "k6/http";
import { check, sleep } from "k6";

const ALB_URL =
  "http://digistar-cloud-2-1812869796.ap-southeast-2.elb.amazonaws.com";

export let options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "30s", target: 150 },
    { duration: "5m", target: 150 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.2"], // Max 20% errors (extreme load)
    http_req_duration: ["p(95)<3000"], // 95% under 3 seconds
  },
};

export default function () {
  // Successful login (bcrypt intensive)
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

  // Failed login (force bcrypt to work harder)
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

  sleep(0.2); // 200ms = 5 req/second per VU × 150 VUs = 750 req/second
}
