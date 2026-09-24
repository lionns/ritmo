import { get } from 'node:https';

// The origin comes from the environment and nowhere else: this repository is public, and a
// hard-coded default goes stale the day the deployment moves, which it did in T-042.
const origin = process.env.RITMO_ORIGIN;
if (!origin) throw new Error('Set RITMO_ORIGIN to the deployed origin, e.g. https://ritmo.example.com');
const httpOrigin = origin.replace(/^https:/, 'http:');
const http = await fetch(`${httpOrigin}/entrar?from=manual`, { redirect: 'manual' });
if (http.status !== 308) throw new Error(`Expected HTTP 308, got ${http.status}`);
if (http.headers.get('location') !== `${origin}/entrar?from=manual`) {
  throw new Error(`Unexpected HTTPS redirect: ${http.headers.get('location')}`);
}
const https = await new Promise((resolve, reject) => {
  get(`${origin}/entrar`, (response) => {
    response.resume();
    response.on('end', () => resolve(response));
  }).on('error', reject);
});
if (https.statusCode !== 200) throw new Error(`Expected HTTPS login 200, got ${https.statusCode}`);
if (https.headers['strict-transport-security'] !== 'max-age=31536000') {
  throw new Error(`Missing HSTS header: ${https.headers['strict-transport-security']}`);
}
console.log('PASS HTTP redirects to HTTPS; HTTPS login sends HSTS');
