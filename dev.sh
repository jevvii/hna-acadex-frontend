#!/bin/bash
# Development server script for HNA Acadex Frontend (Expo)
# Usage: ./dev.sh [android|ios|web]

PLATFORM=${1:-android}

echo "🚀 Starting HNA Acadex Frontend Development Server"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📱 Platform: $PLATFORM"
echo ""
echo "📡 Current API URL: $(grep EXPO_PUBLIC_API_URL .env | grep -v '^#' | head -1)"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  No .env file found. Creating from .env.example..."
    cp .env.example .env
fi

echo "Starting Expo..."
echo "Press Ctrl+C to stop"
echo ""

# Start Expo
npx expo start -c