# DEMO — Production Deployment & DevOps Runbook
**Infrastructure, Process Management & Production Hardening**

---

## 1. Production Architecture Blueprint

In production, DEMO can run either as a lightweight systemd / PM2 service behind an Nginx reverse proxy, or inside a containerized Docker cluster.

```
Internet (HTTPS 443)
       |
       v
 [Cloudflare / CDN] (DDoS Protection, SSL Termination, Asset Caching)
       |
       v
 [Nginx Reverse Proxy] (TLS 1.3, Rate Limiting, Static Asset Gzip/Brotli)
       |
       +---> /api/*  --> Proxy to Node.js Express (http://127.0.0.1:3000)
       +---> /*      --> Serves pre-built React SPA static dist files
```

---

## 2. Option A: Standalone VM Deployment (Ubuntu 22.04 / 24.04 LTS)

### Step 1: Install Node.js 22+
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Step 2: Clone & Build
```bash
git clone <repo_url> /var/www/demo-ecommerce
cd /var/www/demo-ecommerce/demo
npm install --omit=dev
npm run build
node database/seed.js
```

### Step 3: Configure Process Manager (PM2)
```bash
sudo npm install -g pm2
pm2 start server/index.js --name "demo-ecommerce" -i 1 --max-memory-restart 500M
pm2 save
pm2 startup
```
*Note: SQLite WAL mode supports one writer process and unlimited concurrent readers. Running a single cluster instance (`-i 1`) with Node's asynchronous event loop easily delivers >3,000 requests per second.*

---

## 3. Option B: Docker Containerization

### `Dockerfile`
```dockerfile
FROM node:22-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/server ./server
COPY --from=builder /app/database ./database
COPY --from=builder /app/client/dist ./client/dist

EXPOSE 3000
CMD ["node", "server/index.js"]
```

---

## 4. Database Backup & Disaster Recovery Strategy

Because SQLite operates as a single file with WAL (`demo.db`, `demo.db-wal`, `demo.db-shm`), safe online backups without interrupting live transactions are performed using the SQLite `VACUUM INTO` command:

```bash
# Automated cron job running every 6 hours
sqlite3 /var/www/demo-ecommerce/demo/database/demo.db "VACUUM INTO '/backups/demo_$(date +\%Y\%m\%d_\%H\%M\%S).db';"
# Sync backup to offsite S3 storage
aws s3 sync /backups s3://demo-ecommerce-db-backups/ --delete
```
