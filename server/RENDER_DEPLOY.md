# FlashRide Server — Render Production Checklist

## Environment Variables (set in Render dashboard → Environment)

| Variable | Required | Notes |
|---|---|---|
| `SUPABASE_URL` | ✅ | From Supabase project settings → API |
| `SUPABASE_ANON_KEY` | ✅ | Public anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Secret** — never expose client-side |
| `ADMIN_SECRET` | ✅ | `openssl rand -hex 32` — share with Vercel admin panel |
| `NODE_ENV` | ✅ | `production` |
| `PORT` | auto | Render injects this automatically |
| `CORS_ORIGINS` | ✅ | Comma-separated: your Expo app + Vercel admin URL |
| `APP_VERSION` | optional | e.g. `1.2.0` — shown at `GET /version` |
| `RATE_LIMIT_GENERAL` | optional | Default `300` req / 15 min |
| `RATE_LIMIT_STRICT` | optional | Default `60` req / 15 min |
| `RATE_LIMIT_AUTH` | optional | Default `10` req / 15 min |

## Render Service Settings

- **Runtime**: Node
- **Build Command**: `npm ci && npm run build`
- **Start Command**: `npm start` (`node dist/index.js`)
- **Health Check Path**: `/health`
- **Auto-Deploy**: ✅ (on push to `main`)

## Post-deploy smoke test

```bash
BASE=https://flashride.onrender.com
SECRET=your-admin-secret

# Public endpoints
curl $BASE/health
curl $BASE/version

# Admin (should return stats JSON)
curl -H "Authorization: Bearer $SECRET" $BASE/admin/stats

# Auth guard (should return 401)
curl $BASE/admin/stats
```

## Security notes

- All `/admin/*` routes require `ADMIN_SECRET` — if unset they return `503`
- `X-Powered-By` header is stripped
- HSTS is set for 1 year (Render provides TLS termination)
- Rate limits are enforced per-IP; tune via env vars if Render's proxy changes IPs
- `SUPABASE_SERVICE_ROLE_KEY` bypasses RLS — keep it server-side only
