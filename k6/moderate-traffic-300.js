import http from "k6/http";
import { check, sleep } from "k6";

const ALB_URL =
  "http://digistar-cloud-2-1812869796.ap-southeast-2.elb.amazonaws.com";

export let options = {
  stages: [
    { duration: "30s", target: 50 },
    { duration: "30s", target: 100 },
    { duration: "1m", target: 300 },
    { duration: "5m", target: 300 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.3"], // Allow 30% errors (extreme stress)
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
      timeout: "5s",
    }
  );

  check(loginRes, {
    "request completed": (r) => r.status === 200 || r.status === 401,
  });

  // Failed login (force bcrypt to work harder)
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

  // 2 req × 300 VUs / 0.2s = ~3000 requests/second
  sleep(0.2);
}
