# Pebble Shipping Dashboard

Live tracking of the 2026 Pebble rollout, built from community-submitted reports on [r/pebble](https://www.reddit.com/r/pebble/comments/1sjk3c7/shipping_mega_thread).

<img width="3420" height="5832" alt="image" src="https://github.com/user-attachments/assets/489c02f1-a6f2-4d8d-819e-898ad23465f7" />

## How it works

The dashboard loads parsed report data from a Cloudflare Worker. The Worker fetches Reddit comments from the shipping mega thread, parses order details (device, color, country, batch, status), caches the JSON response, and the frontend visualizes the rollout progress with interactive charts and a filterable table.

## Cloudflare Worker

Deploy the parser API with:

```sh
npm install
npx wrangler deploy
```

The Worker serves parsed dashboard data at `/api/reports`. The deployed dashboard points `window.PEBBLE_DATA_API_URL` at `https://pebble-api.o-0.dev/api/reports`.
