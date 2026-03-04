# Listo Deployment Guide - Ubuntu 24.04

This guide covers deploying Listo to an Ubuntu 24.04 server using nginx as a reverse proxy.

## Prerequisites Overview

| Component | Version | Purpose |
|-----------|---------|---------|
| .NET SDK | 10.0 | Backend API runtime |
| Node.js | 20.x LTS or 22.x | Frontend build |
| MySQL | 8.0+ | Database |
| nginx | Latest | Reverse proxy |

---

## 1. System Preparation

Update the system and install common dependencies:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget gnupg apt-transport-https software-properties-common
```

---

## 2. Install .NET 10 SDK

Add the Microsoft package repository and install .NET 10:

```bash
# Add Microsoft package signing key
wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
rm packages-microsoft-prod.deb

# Install .NET 10 SDK
sudo apt update
sudo apt install -y dotnet-sdk-10.0

# Verify installation
dotnet --version
```

---

## 3. Install Node.js 22.x LTS

Using NodeSource repository:

```bash
# Add NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

---

## 4. Install MySQL 8.0

```bash
# Install MySQL server
sudo apt install -y mysql-server

# Secure the installation
sudo mysql_secure_installation

# Start and enable MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

### Create Database and User

```bash
sudo mysql
```

```sql
CREATE DATABASE listo CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'listo_user'@'localhost' IDENTIFIED BY 'YOUR_SECURE_PASSWORD';
GRANT ALL PRIVILEGES ON listo.* TO 'listo_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## 5. Install nginx

```bash
sudo apt install -y nginx

# Start and enable nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Verify nginx is running
sudo systemctl status nginx
```

---

## 6. Create Application User

Create a dedicated user to run the application:

```bash
sudo useradd -m -s /bin/bash listo
sudo mkdir -p /var/www/listo
sudo chown -R listo:listo /var/www/listo
```

---

## 7. Deploy the Application

### 7.1 Clone or Copy Application Files

```bash
# Switch to listo user
sudo -u listo -i

# Clone repository (or copy files)
cd /var/www/listo
git clone <your-repo-url> app
cd app
```

### 7.2 Build the Frontend

```bash
cd /var/www/listo/app/listo/listo-web

# Install dependencies
npm ci

# Build for production
npm run build

# The build output will be in the 'dist' directory
```

### 7.3 Configure and Build the Backend

```bash
cd /var/www/listo/app/listo/listo-api

# Copy and configure appsettings
cp appsettings.json.example appsettings.json
```

Edit `appsettings.json` with production values:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=listo;User=listo_user;Password=YOUR_SECURE_PASSWORD;"
  },
  "Jwt": {
    "Secret": "YOUR_MIN_32_CHARACTER_SECRET_KEY_HERE",
    "Issuer": "Listo",
    "Audience": "Listo"
  },
  "InitialAdmin": {
    "Email": "admin@example.com",
    "Password": "SecureAdminPassword123!"
  }
}
```

Build and publish the API:

```bash
# Publish release build
dotnet publish -c Release -o /var/www/listo/api

# Apply database migrations
cd /var/www/listo/app/listo/listo-api
dotnet ef database update
```

---

## 8. Configure systemd Service for API

Create a systemd service file:

```bash
sudo nano /etc/systemd/system/listo-api.service
```

Add the following content:

```ini
[Unit]
Description=Listo API
After=network.target mysql.service

[Service]
WorkingDirectory=/var/www/listo/api
ExecStart=/usr/bin/dotnet /var/www/listo/api/Listo.Api.dll
Restart=always
RestartSec=10
KillSignal=SIGINT
SyslogIdentifier=listo-api
User=listo
Environment=ASPNETCORE_ENVIRONMENT=Production
Environment=ASPNETCORE_URLS=http://localhost:5286
Environment=DOTNET_PRINT_TELEMETRY_MESSAGE=false

[Install]
WantedBy=multi-user.target
```

Enable and start the service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable listo-api
sudo systemctl start listo-api

# Check status
sudo systemctl status listo-api

# View logs
sudo journalctl -u listo-api -f
```

---

## 9. Configure nginx

### 9.1 Create nginx Site Configuration

```bash
sudo nano /etc/nginx/sites-available/listo
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name your-domain.com;  # Replace with your domain or server IP

    # Frontend static files
    root /var/www/listo/app/listo/listo-web/dist;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;
    gzip_min_length 1000;

    # API reverse proxy
    location /api {
        proxy_pass http://localhost:5286;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Large file upload support (250MB)
        client_max_body_size 260M;
        proxy_read_timeout 600;
        proxy_send_timeout 600;
        proxy_connect_timeout 60;
    }

    # Swagger UI (optional - consider disabling in production)
    location /swagger {
        proxy_pass http://localhost:5286;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # SPA fallback - serve index.html for client-side routing
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 9.2 Enable the Site

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/listo /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
```

---

## 10. SSL/TLS with Let's Encrypt (Recommended)

Install Certbot and obtain a certificate:

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com

# Certbot will automatically configure nginx for HTTPS
# Auto-renewal is set up automatically via systemd timer
```

Verify auto-renewal:

```bash
sudo certbot renew --dry-run
```

---

## 11. Firewall Configuration

If using UFW:

```bash
# Allow SSH, HTTP, and HTTPS
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## 12. Verification

1. **Check API is running:**
   ```bash
   curl http://localhost:5286/api/system/health
   ```

2. **Check nginx is serving:**
   ```bash
   curl http://your-domain.com
   ```

3. **Check logs if issues arise:**
   ```bash
   # API logs
   sudo journalctl -u listo-api -f

   # nginx logs
   sudo tail -f /var/log/nginx/error.log
   sudo tail -f /var/log/nginx/access.log
   ```

---

## Troubleshooting

### API won't start
- Check connection string in appsettings.json
- Verify MySQL is running: `sudo systemctl status mysql`
- Check permissions: `ls -la /var/www/listo/api`

### 502 Bad Gateway
- API service not running: `sudo systemctl status listo-api`
- Wrong port in nginx config
- Check API logs: `sudo journalctl -u listo-api`

### Frontend not loading
- Check nginx configuration: `sudo nginx -t`
- Verify build files exist: `ls /var/www/listo/app/listo/listo-web/dist`

### Database connection issues
- Verify MySQL user permissions
- Check if MySQL is listening: `sudo ss -tlnp | grep 3306`

---

## Maintenance

### Update Application

```bash
# Stop API
sudo systemctl stop listo-api

# Pull latest code
cd /var/www/listo/app
sudo -u listo git pull

# Rebuild frontend
cd listo/listo-web
sudo -u listo npm ci
sudo -u listo npm run build

# Rebuild and publish API
cd ../listo-api
sudo -u listo dotnet publish -c Release -o /var/www/listo/api

# Apply any new migrations
sudo -u listo dotnet ef database update

# Restart API
sudo systemctl start listo-api
```

### Backup Database

```bash
mysqldump -u listo_user -p listo > /backup/listo_$(date +%Y%m%d).sql
```
