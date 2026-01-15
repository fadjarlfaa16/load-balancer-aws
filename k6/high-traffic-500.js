import http from "k6/http";
import { check, sleep } from "k6";

const ALB_URL =
  "http://digistar-cloud-2-1812869796.ap-southeast-2.elb.amazonaws.com";

export let options = {
  stages: [
    { duration: "30s", target: 100 },
    { duration: "30s", target: 200 },
    { duration: "1m", target: 500 },
    { duration: "6m", target: 500 },
    { duration: "1m", target: 0 },
  ],
  thresholds: {
    http_req_failed: ["rate<0.4"], // Allow 40% errors (insane stress)
  },
};

export default function () {
  // Login attempt
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

  // Login attempt 2
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

  // Failed login
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

  // 3 req × 500 VUs / 0.15s = ~10,000 requests/second
  sleep(0.15);
}
