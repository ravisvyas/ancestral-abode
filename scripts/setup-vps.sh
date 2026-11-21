#!/usr/bin/env bash
# ==============================================================================
# Ancestral Abode Homestay — Hostinger VPS Automated Setup Script
# Target: Ubuntu 20.04 / 22.04 / 24.04 (Hostinger VPS)
# Domain: ancestralabodehomestay.com & www.ancestralabodehomestay.com
# Port: 4000
# ==============================================================================

set -e

DOMAIN="ancestralabodehomestay.com"
APP_DIR="/var/www/ancestralabode"
APP_PORT=4000
ARCHIVE_PATH="/var/www/ancestral-abode-deploy.tar.gz"

echo "=========================================================="
echo "   Ancestral Abode Homestay — VPS Setup & Deployment      "
echo "   Domain: ${DOMAIN}                                      "
echo "   Port:   ${APP_PORT}                                    "
echo "=========================================================="

# Ensure running as root
if [ "$EUID" -ne 0 ]; then
  echo "❌ Please run as root (or with sudo)"
  exit 1
fi

# 1. Prompt for Passwords (with secure defaults if left empty)
read -sp "Enter MySQL DB Password for 'homestay_user' [Press Enter for default: HomestayJaipur@2026!]: " DB_PASSWORD
echo ""
DB_PASSWORD=${DB_PASSWORD:-"HomestayJaipur@2026!"}

read -sp "Enter Admin Dashboard Password [Press Enter for default: AncestralAbode@2026!]: " ADMIN_PASSWORD
echo ""
ADMIN_PASSWORD=${ADMIN_PASSWORD:-"AncestralAbode@2026!"}

# 2. Install MySQL Server if not installed
echo ""
echo "▶ Checking MySQL Server..."
if ! command -v mysql >/dev/null 2>&1; then
  echo "📦 Installing mysql-server..."
  apt update -y
  apt install -y mysql-server
  systemctl enable mysql
  systemctl start mysql
else
  echo "✔ MySQL is already installed."
  systemctl start mysql 2>/dev/null || true
fi

# 3. Create Database & User
echo "▶ Initializing Database 'homestay_db'..."
mysql -e "CREATE DATABASE IF NOT EXISTS homestay_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -e "CREATE USER IF NOT EXISTS 'homestay_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
mysql -e "ALTER USER 'homestay_user'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';"
mysql -e "GRANT ALL PRIVILEGES ON homestay_db.* TO 'homestay_user'@'localhost'; FLUSH PRIVILEGES;"
echo "✔ MySQL database and user configured."

# 4. Extract Application
echo "▶ Deploying Application to ${APP_DIR}..."
mkdir -p "${APP_DIR}"

if [ -f "${ARCHIVE_PATH}" ]; then
  tar -xzf "${ARCHIVE_PATH}" -C "${APP_DIR}" --strip-components=1
  echo "✔ Build package extracted."
else
  echo "⚠️ Warning: Archive ${ARCHIVE_PATH} not found. Assuming files are already in ${APP_DIR}."
fi

cd "${APP_DIR}"

# 5. Write Production .env
echo "▶ Generating production .env configuration..."
cat << EOF > .env
NODE_ENV=production
PORT=${APP_PORT}
HOST=0.0.0.0

DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=homestay_db
DB_USER=homestay_user
DB_PASSWORD=${DB_PASSWORD}

ADMIN_USERNAME=admin
ADMIN_PASSWORD=${ADMIN_PASSWORD}
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "ancestral_abode_secure_jwt_token_2026_jaipur")

CORS_ORIGINS=https://${DOMAIN},https://www.${DOMAIN},http://${DOMAIN},http://www.${DOMAIN}

EMAIL_FROM="Ancestral Abode Homestay" <ancestralabodehomestay@gmail.com>
ADMIN_NOTIFICATION_EMAIL=ancestralabodehomestay@gmail.com
EOF

chmod 600 .env
echo "✔ .env written successfully."

# 6. Install Dependencies & Seed Database
echo "▶ Installing production npm dependencies..."
npm ci --omit=dev

echo "▶ Seeding database schema and initial inventory..."
npm run db:setup
echo "✔ Database schema applied."

# 7. Start / Restart PM2
echo "▶ Configuring PM2 process..."
# Stop previous instance if already registered
pm2 delete ancestral-abode 2>/dev/null || true
pm2 start ecosystem.config.cjs --env production
pm2 save
echo "✔ PM2 process 'ancestral-abode' running on port ${APP_PORT}."

# 8. Configure Nginx
echo "▶ Setting up Nginx Reverse Proxy for ${DOMAIN}..."
NGINX_CONF="/etc/nginx/sites-available/${DOMAIN}"

cat << 'EOF' > "${NGINX_CONF}"
server {
    listen 80;
    listen [::]:80;
    server_name ancestralabodehomestay.com www.ancestralabodehomestay.com;

    # Gzip Compression
    gzip on;
    gzip_vary on;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml image/svg+xml;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }
}
EOF

ln -sf "${NGINX_CONF}" "/etc/nginx/sites-enabled/${DOMAIN}"

echo "▶ Testing Nginx configuration..."
nginx -t
systemctl reload nginx
echo "✔ Nginx configuration active."

# 9. SSL with Certbot
echo ""
echo "=========================================================="
echo "▶ SSL Certificate (HTTPS) Setup"
echo "=========================================================="
read -p "Would you like to issue a free SSL Certificate with Let's Encrypt now? [y/N]: " RUN_SSL

if [[ "$RUN_SSL" =~ ^([yY][eE][sS]|[yY])$ ]]; then
  if ! command -v certbot >/dev/null 2>&1; then
    apt install -y certbot python3-certbot-nginx
  fi
  certbot --nginx -d "${DOMAIN}" -d "www.${DOMAIN}" --redirect --agree-tos --email ancestralabodehomestay@gmail.com -n || {
    echo "⚠️ Certbot could not verify DNS yet. Ensure your domain's DNS A Record points to 187.52.122.128."
    echo "You can re-run certbot later with:"
    echo "  certbot --nginx -d ${DOMAIN} -d www.${DOMAIN}"
  }
fi

echo ""
echo "=========================================================="
echo "🎉 DEPLOYMENT COMPLETE!"
echo "Website URL:      http://${DOMAIN}"
echo "Admin Portal:     http://${DOMAIN}/admin"
echo "Admin Username:   admin"
echo "Admin Password:   (The password you entered above)"
echo "PM2 Status:       Run 'pm2 status'"
echo "App Logs:         Run 'pm2 logs ancestral-abode'"
echo "=========================================================="
