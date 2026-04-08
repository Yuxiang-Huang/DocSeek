#!/usr/bin/env bash
# setup_and_test.sh
# Installs dependencies for the frontend and backend, then runs all tests.

set -e

REPO_ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo " DocSeek — Setup & Test Runner"
echo "=========================================="

# --------------------------------------------------------------------------
# Frontend (client) — Node/npm
# --------------------------------------------------------------------------

echo ""
echo ">>> [1/4] Installing frontend dependencies..."
cd "$REPO_ROOT/client"
npm install

echo ""
echo ">>> [2/4] Running frontend tests (Vitest)..."
npm test

# --------------------------------------------------------------------------
# Backend (api) — Bun
# --------------------------------------------------------------------------

echo ""
echo ">>> [3/4] Installing backend dependencies..."
cd "$REPO_ROOT/api"
bun install

echo ""
echo ">>> [4/4] Running backend tests (Bun test)..."
bun test

echo ""
echo "=========================================="
echo " All tests complete."
echo "=========================================="
