#!/usr/bin/env bash
# ==============================================================================
# Ancestral Abode Homestay — 1-Click Upload & Deploy to Hostinger VPS
# Run this on your Mac terminal
# ==============================================================================

set -e

SERVER_IP="187.52.122.128"
SERVER_USER="root"
BUILD_ARCHIVE="dist/ancestral-abode-deploy.tar.gz"
SETUP_SCRIPT="scripts/setup-vps.sh"

echo "=========================================================="
echo "  Ancestral Abode — Upload to Hostinger VPS (${SERVER_IP}) "
echo "=========================================================="

# 1. Check if build exists, if not build it
if [ ! -f "${BUILD_ARCHIVE}" ]; then
  echo "▶ Production build not found. Running npm run build..."
  npm run build
fi

# 2. Upload files via SCP
echo "▶ Uploading build archive and setup script to ${SERVER_USER}@${SERVER_IP}:/var/www/ ..."
scp "${BUILD_ARCHIVE}" "${SETUP_SCRIPT}" "${SERVER_USER}@${SERVER_IP}:/var/www/"

echo ""
echo "✔ Files uploaded successfully to /var/www/ on the VPS!"
echo ""
echo "=========================================================="
echo "▶ Next Step: Run this command in your VPS terminal:"
echo "=========================================================="
echo "  bash /var/www/setup-vps.sh"
echo "=========================================================="
