# Ancestral Abode — Production Deployment Guide

This document outlines how to deploy the Ancestral Abode Boutique Homestay web application on your production server.

---

## 📦 What is in the Build?

When you run `npm run build`, a clean production distribution is created in:
- `dist/production/`: The full unpacked application ready for deployment.
- `dist/ancestral-abode-deploy.zip`: Standalone zip archive for upload to cPanel or server.
- `dist/ancestral-abode-deploy.tar.gz`: Linux compressed archive for VPS / SSH deployments.

---

## 🚀 Option 1: Standard Linux VPS Deployment (Recommended)
*(Ubuntu 22.04 / 24.04, Debian, Rocky Linux, or Amazon Linux with Node.js & MySQL)*

### 1. Prerequisites on Server
Ensure Node.js (version 18 or 20+), npm, PM2, and MySQL are installed:
```bash
# Install Node.js 20 LTS (if not already installed)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs mysql-server nginx

# Install PM2 globally for zero-downtime process management
sudo npm install -g pm2
```

### 2. Upload and Extract
Upload `dist/ancestral-abode-deploy.tar.gz` (or the `dist/production` directory) to your server, for example in `/var/www/homestay`:
```bash
sudo mkdir -p /var/www/homestay
sudo chown -R $USER:$USER /var/www/homestay

# Extract archive
tar -xzf ancestral-abode-deploy.tar.gz -C /var/www/homestay/
cd /var/www/homestay/production
```

### 3. Install Production Dependencies
```bash
npm ci --omit=dev
```

### 4. Configure Environment Variables
Copy `.env.example` to `.env` and fill in your production settings:
```bash
cp .env.example .env
nano .env
```

**Key `.env` Configuration Values**:
```env
NODE_ENV=production
PORT=4000
HOST=0.0.0.0

# Database
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=homestay_db
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# Admin Credentials
ADMIN_USERNAME=admin
ADMIN_PASSWORD=YourStrongPasswordHere
JWT_SECRET=generate-a-strong-random-secret-key

# Allowed Domain Origins
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com

# SMTP Email Configuration (Optional - for real emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=ancestralabodehomestay@gmail.com
SMTP_PASS=your_app_specific_password
EMAIL_FROM="Ancestral Abode Jaipur" <ancestralabodehomestay@gmail.com>
ADMIN_NOTIFICATION_EMAIL=ancestralabodehomestay@gmail.com
```

### 5. Initialize MySQL Database & Default Data
Run the automated schema creation and data migration:
```bash
npm run db:setup
```

### 6. Start the Process with PM2
```bash
# Start cluster using the provided configuration
pm2 start ecosystem.config.cjs --env production

# Save PM2 process list to resurrect automatically after server reboots
pm2 save
pm2 startup
```

### 7. Configure Nginx Reverse Proxy & SSL
Create `/etc/nginx/sites-available/homestay`:
```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

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
    }
}
```
Enable the site and obtain a free Let's Encrypt SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/homestay /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

---

## 🐳 Option 2: Docker & Docker Compose Deployment

If you prefer containers, the build includes a multi-stage `Dockerfile` and `docker-compose.yml`:

```bash
# 1. Edit .env with your desired DB passwords and domain
cp .env.example .env

# 2. Start the full stack (MySQL + Web App) in background
docker compose up -d --build

# 3. View logs
docker compose logs -f app
```

The database and tables are automatically initialized on first container startup.

---

## 🖥️ Option 3: cPanel / Shared Hosting with Node.js Selector

1. Log into your cPanel account.
2. Under **Software**, click **Setup Node.js App**.
3. Create a new Node.js Application:
   - **Node.js version**: 18.x or 20.x
   - **Application mode**: Production
   - **Application root**: `homestay` (or `public_html/homestay`)
   - **Application startup file**: `server.js`
4. Upload `dist/ancestral-abode-deploy.zip` using cPanel **File Manager** into the application root and extract it.
5. Create a MySQL database and user in cPanel **MySQL Databases**.
6. Set the database credentials in the **Environment variables** section or in `.env`.
7. Click **Run NPM Install** in the cPanel Node.js interface.
8. Run `node scripts/setup-db.js` in cPanel Terminal to initialize the tables.
9. Click **Restart** to launch the site.

---

## 🔑 Admin Portal Access After Deployment
Once deployed, you can access the management portal at:
```
https://yourdomain.com/admin
```
Log in using your configured `ADMIN_USERNAME` and `ADMIN_PASSWORD` (default: `admin` / `AncestralAbode@2026`).

Inside the admin portal you can:
- Change room prices per night anytime (changes reflect live immediately).
- Review all guest bookings and confirm them (sends confirmation emails).
- Send payment details and UPI links to guests.
- Manage guest inquiries and concierge transport requests.
