# Deployment Status

## Current Status: ✅ Ready for VPS Deployment

The application is fully configured and ready to deploy to a VPS.

## What We Built

A QR code tracking system that:
- Creates unique QR codes with optional GPS coordinates
- Tracks scans (count, timestamp, IP hash, user agent)
- Redirects to configurable destinations (default: google.com)
- Provides stats API for analytics
- Uses SQLite database with persistent storage

## Architecture

```
User scans QR code
       ↓
GET https://qr.ashhill.dev/q/{qr_id}
       ↓
FastAPI records scan + updates counter
       ↓
302 Redirect to destination
```

**Stack:**
- FastAPI (Python)
- SQLite database
- Docker + Docker Compose
- Caddy (reverse proxy + auto SSL)

## File Structure

```
.
├── api/
│   ├── main.py              # FastAPI application
│   └── requirements.txt     # Python dependencies
├── data/                    # SQLite database (auto-created, gitignored)
├── init.sql                 # Database schema
├── Dockerfile               # API container
├── docker-compose.yml       # Multi-container setup
├── Caddyfile                # Reverse proxy config
├── .env.example             # Environment variables template
└── .gitignore
```

## Environment Variables

Copy `.env.example` to `.env` on server and set:

```bash
API_KEY=<generate with: openssl rand -hex 32>
BASE_URL=https://qr.ashhill.dev
DEFAULT_DEST=https://google.com
DB_PATH=/data/app.db
```

## Next Steps: VPS Deployment

### 1. Get a VPS

Choose a provider:
- **DigitalOcean** (~$6/mo for basic droplet)
- **Linode** (~$5/mo)
- **Hetzner** (~$4/mo, EU-based)
- **Vultr** (~$5/mo)

Specs needed: 1GB RAM, 1 CPU, 25GB disk (smallest tier is fine)

### 2. Initial VPS Setup

```bash
# SSH into VPS
ssh root@your.vps.ip

# Update system
apt update && apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Install Docker Compose
apt install docker-compose -y

# Install Git
apt install git -y
```

### 3. Deploy Application

```bash
# Clone repo
git clone https://github.com/yourusername/qr-code-tracking.git
cd qr-code-tracking

# Generate API key
openssl rand -hex 32

# Create .env file
cat > .env << EOF
API_KEY=<paste_generated_key_here>
BASE_URL=https://qr.ashhill.dev
DEFAULT_DEST=https://google.com
DB_PATH=/data/app.db
EOF

# Update docker-compose.yml API_KEY with your generated key
# (Or use .env file - currently hardcoded as "change_me")

# Start containers
docker-compose up -d

# Check logs
docker-compose logs -f
```

### 4. Configure Cloudflare DNS

In Cloudflare dashboard:

1. Go to DNS settings for ashhill.dev
2. Add A record:
   - **Name:** `qr`
   - **IPv4 address:** Your VPS IP
   - **Proxy status:** Proxied (orange cloud) ✅
   - **TTL:** Auto

### 5. Wait for SSL

Caddy will automatically get SSL certificate from Let's Encrypt when traffic hits the VPS through Cloudflare. First request may take 10-30 seconds.

### 6. Test It

```bash
# Create a QR code
curl -X PUT "https://qr.ashhill.dev/api/qr" \
  -H "content-type: application/json" \
  -H "x-api-key: your_api_key_here" \
  -d '{"coords":{"lat":41.8781,"lon":-87.6298},"dest":"https://google.com"}'

# Response should look like:
# {"id":"abc123xyz","redirectUrl":"https://qr.ashhill.dev/q/abc123xyz"}

# Visit the URL in browser - should redirect to google.com

# Check stats
curl "https://qr.ashhill.dev/api/qr/abc123xyz/stats" \
  -H "x-api-key: your_api_key_here"
```

## Database Persistence

Database is stored in `./data/app.db` on the host machine (via Docker volume mount). It persists across container restarts and updates.

To backup:
```bash
cp data/app.db data/app.db.backup-$(date +%Y%m%d)
```

## Updating the Application

```bash
# SSH into VPS
ssh root@your.vps.ip
cd qr-code-tracking

# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build

# Database persists automatically
```

## Security Notes

- **API Key**: Required for creating QR codes and viewing stats
- **IP Privacy**: IPs are SHA256-hashed before storage (not reversible)
- **Cloudflare Proxy**: Provides DDoS protection and hides VPS IP
- **Auto SSL**: Caddy manages Let's Encrypt certificates

## Troubleshooting

**Container won't start:**
```bash
docker-compose logs api
```

**Database issues:**
```bash
docker-compose exec api ls -la /data/
```

**Networking issues:**
```bash
# Check if port 443 is listening
netstat -tlnp | grep 443

# Test from VPS
curl http://localhost:80
```

**Cloudflare not connecting:**
- Verify A record points to correct IP
- Ensure Cloudflare proxy is enabled (orange cloud)
- Check SSL/TLS mode is "Full" (not "Full (strict)")

## Cost Estimate

- VPS: $4-6/month
- Cloudflare: Free (basic DNS + proxy)
- Domain: Already owned (ashhill.dev)

**Total: ~$5/month**
