# Deploy to AWS EC2 (Docker + nginx)

The stack runs **nginx on port 80** (no `:3000` in the URL) and proxies to the Node API on an internal Docker network.

## Prerequisites

- EC2 instance (Ubuntu 22.04 or Amazon Linux 2023 recommended)
- Security group: **SSH (22)** from your IP, **HTTP (80)** from clients that need API access
- Git (or copy the project onto the instance)

## First-time setup on EC2

### 1. Install Docker

**Ubuntu 22.04:**

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER
```

Log out and SSH back in, then:

```bash
docker --version
docker compose version
```

### 2. Clone and start

```bash
cd ~
git clone https://github.com/YOUR_USER/million_rows.git
cd million_rows
docker compose up -d --build
```

Optional faster first boot (smaller CSV):

```bash
TOTAL_ROWS=10000 docker compose up -d --build
```

### 3. Watch logs (first boot may take 1–2 minutes)

```bash
docker compose logs -f
```

Wait until the API logs `Server listening on http://localhost:3000`.

### 4. Verify

```bash
curl -s http://127.0.0.1/health
```

From your machine (replace with your EC2 public IP):

| Resource | URL |
|----------|-----|
| Health | http://YOUR_EC2_PUBLIC_IP/health |
| API | http://YOUR_EC2_PUBLIC_IP/api/rows |
| Swagger | http://YOUR_EC2_PUBLIC_IP/api-docs |

---

## Update an existing EC2 deployment (already on port 3000)

Run these on the EC2 instance after pulling the new code with nginx.

### 1. Update security group (AWS Console)

- **Add** inbound rule: **HTTP**, port **80**, source as needed (e.g. `0.0.0.0/0` for public demo).
- **Optional:** remove the old **Custom TCP 3000** rule once you confirm port 80 works.

### 2. Pull latest code

```bash
cd ~/million_rows   # or your clone path
git pull
```

If you deploy without Git, copy the updated project (including the `nginx/` folder) over the existing directory.

### 3. Rebuild and restart

```bash
docker compose down
docker compose up -d --build
```

Your CSV data is kept in the `csv_data` volume unless you pass `-v` to `down`.

### 4. Confirm nginx is listening

```bash
docker compose ps
curl -s http://127.0.0.1/health
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1/api-docs
```

Both should succeed (`health` JSON, `/api-docs` → `200`).

### 5. Test from your browser

Use URLs **without a port**:

- http://YOUR_EC2_PUBLIC_IP/health
- http://YOUR_EC2_PUBLIC_IP/api-docs

Old URLs with `:3000` will stop working unless you still expose port 3000 (this setup does not).

### 6. Troubleshooting

| Problem | Fix |
|---------|-----|
| Connection refused on :80 | Security group must allow TCP 80; `docker compose ps` should show `nginx` Up |
| 502 Bad Gateway | API still starting or generating CSV — `docker compose logs shipping-api` |
| Still need :3000 | Old containers running — `docker compose down` then `up -d --build` |
| Ubuntu firewall | `sudo ufw allow 80/tcp` if `ufw` is active |

---

## Maintenance

```bash
# Logs
docker compose logs -f

# Restart
docker compose restart

# Stop
docker compose down

# Reset CSV and regenerate on next start
docker compose down -v
docker compose up -d --build
```

## Optional: HTTPS later

Add a domain pointing to the EC2 IP, then extend nginx with TLS (e.g. Certbot) or terminate HTTPS on an AWS Application Load Balancer. The API container can stay on the internal port 3000.
