#!/bin/bash
# setup-ec2.sh
# Automated setup script untuk EC2 instance

set -e  # Exit on error

echo "================================"
echo "Exam System EC2 Setup Script"
echo "================================"

# Update system
echo "[1/8] Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install dependencies
echo "[2/8] Installing dependencies (Nginx, curl, unzip)..."
sudo apt install -y nginx wget curl unzip awscli

# Install Go 1.23
echo "[3/8] Installing Go 1.23..."
cd /tmp
wget -q https://go.dev/dl/go1.23.0.linux-amd64.tar.gz
sudo rm -rf /usr/local/go
sudo tar -C /usr/local -xzf go1.23.0.linux-amd64.tar.gz
echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.bashrc
export PATH=$PATH:/usr/local/go/bin

# Verify Go
go version

# Create app directory
echo "[4/8] Creating application directory..."
sudo mkdir -p /opt/exam-system
sudo chown ubuntu:ubuntu /opt/exam-system
cd /opt/exam-system

# Download from S3 or manual upload required here
echo "[5/8] Deployment package setup..."
echo "NOTE: Upload exam-deploy.tar.gz to /opt/exam-system/ manually or via S3"
echo "Run: aws s3 cp s3://YOUR-BUCKET/exam-deploy.tar.gz ."
# Uncomment if using S3:
# aws s3 cp s3://exam-system-deploy-bucket/exam-deploy.tar.gz .
# tar -xzf exam-deploy.tar.gz

# Setup environment variables
echo "[6/8] Creating .env configuration..."
cat > /opt/exam-system/server/.env <<'EOF'
PORT=3000
APP_USER=admin
APP_PASS=admin123
TOKEN_SECRET=DigistarClassCloud2-1
AWS_REGION=ap-southeast-2
DDB_TABLE_QUIZZES=ExamQuizzes
DDB_TABLE_ATTEMPTS=ExamAttempts
EOF

chmod 600 /opt/exam-system/server/.env

# Create systemd service
echo "[7/8] Creating systemd service..."
sudo tee /etc/systemd/system/exam-api.service > /dev/null <<'EOF'
[Unit]
Description=Exam API Service
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/exam-system/server
Environment="PATH=/usr/local/go/bin:/usr/bin:/bin"
ExecStart=/opt/exam-system/server/exam-api
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Setup Nginx
echo "[8/8] Configuring Nginx..."
sudo cp /opt/exam-system/deployment/nginx.conf /etc/nginx/sites-available/exam-system
sudo ln -sf /etc/nginx/sites-available/exam-system /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test nginx config
sudo nginx -t

# Enable and start services
echo "Starting services..."
sudo systemctl daemon-reload
sudo systemctl enable exam-api
sudo systemctl start exam-api
sudo systemctl restart nginx

# Status check
echo ""
echo "================================"
echo "Setup Complete!"
echo "================================"
echo ""
echo "Service Status:"
sudo systemctl status exam-api --no-pager
sudo systemctl status nginx --no-pager

echo ""
echo "Testing endpoints:"
curl -s http://localhost/health && echo "✓ Nginx health OK"
curl -s http://localhost:3000/api/health && echo "✓ API health OK"

echo ""
echo "Next steps:"
echo "1. Create AMI from this instance"
echo "2. Setup Load Balancer"
echo "3. Configure Auto Scaling"
echo ""
echo "View logs:"
echo "  sudo journalctl -u exam-api -f"
echo "  sudo tail -f /var/log/nginx/error.log"
