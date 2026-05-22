# Deploy to AWS EC2 (Docker + nginx + Cloudflare)

Public URL: **https://shipping.ifrstech.com**

Cloudflare terminates HTTPS. The EC2 instance serves **HTTP on port 80** only (no origin SSL).

## Prerequisites

- EC2 instance with Docker
- Domain **shipping.ifrstech.com** in Cloudflare
- Security group: **SSH (22)**, **HTTP (80)** — port 443 on EC2 is **not** required

## Cloudflare DNS & SSL

1. **DNS** — Create an **A** record:
   - Name: `shipping` (or full `shipping.ifrstech.com`)
   - Content: your EC2 **public IPv4**
   - Proxy status: **Proxied** (orange cloud)

2. **SSL/TLS** → Overview → encryption mode: **Flexible**
   - Visitors: `https://` → Cloudflare
   - Cloudflare → your server: `http://` on port 80

   Do **not** use Full (strict) unless you add a certificate on the origin.

3. Wait a few minutes for DNS to propagate after changes.

## First-time setup on EC2

```bash
cd ~
git clone https://github.com/YOUR_USER/million_rows.git
cd million_rows
docker compose up -d --build
```

Optional faster first boot:

```bash
TOTAL_ROWS=10000 docker compose up -d --build
```

Watch logs until the API is ready:

```bash
docker compose logs -f shipping-api
```

Verify on the server:

```bash
curl -s -H "Host: shipping.ifrstech.com" http://127.0.0.1/health
```

## Public URLs (no port)

| Resource | URL |
|----------|-----|
| Health | https://shipping.ifrstech.com/health |
| API | https://shipping.ifrstech.com/api/rows |
| Swagger | https://shipping.ifrstech.com/api-docs |
| OpenAPI JSON | https://shipping.ifrstech.com/api-docs.json |

Frontend base URL: `https://shipping.ifrstech.com`

---

## Update an existing EC2 deployment

```bash
cd ~/million_rows
git pull
docker compose down
docker compose up -d --build
```

### Security group

- Allow **TCP 80** (HTTP from Cloudflare / internet)
- Remove **TCP 3000** if still open (API is internal only)
- **443** on EC2 is not needed with Cloudflare Flexible SSL

### After deploy

```bash
docker compose ps
curl -s -H "Host: shipping.ifrstech.com" http://127.0.0.1/health
```

Then open https://shipping.ifrstech.com/health in a browser.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| 522 / timeout from Cloudflare | EC2 down, security group blocks 80, or nginx/API not running |
| 502 Bad Gateway | API still generating CSV — `docker compose logs shipping-api` |
| 521 / connection refused | Nothing listening on 80 — `docker compose ps` |
| Wrong site / default nginx | DNS not pointing to this EC2; check A record IP |
| Redirect loop | Cloudflare SSL set to **Full** without origin cert — switch to **Flexible** |
| Works on IP, not domain | Add `Host` header test above; fix Cloudflare DNS A record |
| Ubuntu firewall | `sudo ufw allow 80/tcp` |

### Test with Host header (on EC2)

```bash
curl -s -H "Host: shipping.ifrstech.com" http://127.0.0.1/health
```

---

## Maintenance

```bash
docker compose logs -f
docker compose restart
docker compose down
docker compose down -v   # also deletes CSV volume
docker compose up -d --build
```

## Change subdomain

Edit `server_name` in `nginx/default.conf`, update Cloudflare DNS, then:

```bash
docker compose up -d --build
```
