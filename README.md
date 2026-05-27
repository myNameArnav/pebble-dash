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

For persistent Worker-side caching, create a KV namespace and bind it as `REPORTS_CACHE`:

```sh
npx wrangler kv namespace create REPORTS_CACHE
```

Then add the returned namespace ID to `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "REPORTS_CACHE"
id = "<namespace-id>"
```

The Worker has a cron trigger that refreshes the cache every 10 minutes. Without the KV binding, it falls back to `caches.default`, which is still server-side but is not as durable or globally consistent as KV.
