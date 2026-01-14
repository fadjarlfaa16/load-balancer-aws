# build-deploy.ps1
# Build dan package aplikasi untuk deployment ke AWS

$ErrorActionPreference = "Stop"

Write-Host "================================" -ForegroundColor Cyan
Write-Host "Exam System - Build for AWS" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Paths
$projectRoot = Split-Path -Parent $PSScriptRoot
$serverPath = Join-Path $projectRoot "server"
$deployPath = Join-Path $projectRoot "deployment"
$outputPath = Join-Path $deployPath "package"

# Clean previous build
Write-Host "[1/5] Cleaning previous builds..." -ForegroundColor Yellow
if (Test-Path $outputPath) {
    Remove-Item -Recurse -Force $outputPath
}
New-Item -ItemType Directory -Path $outputPath | Out-Null

# Build Go binary for Linux
Write-Host "[2/5] Building Go binary for Linux (amd64)..." -ForegroundColor Yellow
Push-Location $serverPath
$env:GOOS = "linux"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"

go build -ldflags="-s -w" -o "$outputPath/exam-api" .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}

# Reset environment
$env:GOOS = ""
$env:GOARCH = ""
Pop-Location

Write-Host "✓ Binary built successfully" -ForegroundColor Green

# Copy .env template
Write-Host "[3/5] Copying configuration files..." -ForegroundColor Yellow
Copy-Item "$serverPath\.env" "$outputPath\.env"
Write-Host "✓ Environment file copied" -ForegroundColor Green

# Copy frontend files
Write-Host "[4/5] Copying frontend files..." -ForegroundColor Yellow
$interfacesPath = Join-Path $projectRoot "interfaces"
$outputInterfaces = Join-Path $outputPath "interfaces"
Copy-Item -Recurse $interfacesPath $outputInterfaces
Write-Host "✓ Frontend files copied" -ForegroundColor Green

# Copy deployment scripts
Copy-Item "$deployPath\setup-ec2.sh" "$outputPath\"
Copy-Item "$deployPath\nginx.conf" "$outputPath\"
Write-Host "✓ Deployment scripts copied" -ForegroundColor Green

# Create archive
Write-Host "[5/5] Creating deployment archive..." -ForegroundColor Yellow
$archiveName = "exam-deploy-$(Get-Date -Format 'yyyyMMdd-HHmmss').tar.gz"
$archivePath = Join-Path $deployPath $archiveName

Push-Location $outputPath
tar -czf $archivePath exam-api .env interfaces setup-ec2.sh nginx.conf

if ($LASTEXITCODE -ne 0) {
    Write-Host "Archive creation failed!" -ForegroundColor Red
    Pop-Location
    exit 1
}
Pop-Location

$archiveSize = (Get-Item $archivePath).Length / 1MB
Write-Host "✓ Archive created: $archiveName ($([math]::Round($archiveSize, 2)) MB)" -ForegroundColor Green

Write-Host ""
Write-Host "================================" -ForegroundColor Cyan
Write-Host "Build Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Deployment package: $archivePath" -ForegroundColor White
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Upload to S3:" -ForegroundColor White
Write-Host "   aws s3 cp `"$archivePath`" s3://YOUR-BUCKET/" -ForegroundColor Gray
Write-Host ""
Write-Host "2. Or SCP to EC2:" -ForegroundColor White
Write-Host "   scp -i exam-keypair.pem `"$archivePath`" ubuntu@YOUR-IP:/opt/exam-system/" -ForegroundColor Gray
Write-Host ""
Write-Host "3. On EC2, extract and run setup:" -ForegroundColor White
Write-Host "   cd /opt/exam-system" -ForegroundColor Gray
Write-Host "   tar -xzf $archiveName" -ForegroundColor Gray
Write-Host "   chmod +x setup-ec2.sh" -ForegroundColor Gray
Write-Host "   sudo ./setup-ec2.sh" -ForegroundColor Gray
Write-Host ""
