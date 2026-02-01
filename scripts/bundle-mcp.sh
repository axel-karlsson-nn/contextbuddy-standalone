#!/bin/bash
# Bundle the MCP server from contextbuddy into this app

set -e

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_DIR="$SCRIPT_DIR/.."
CONTEXTBUDDY_DIR="${CONTEXTBUDDY_DIR:-$HOME/contextbuddy}"
MCP_SERVER_DIR="$PROJECT_DIR/mcp-server"

echo "Bundling MCP server from $CONTEXTBUDDY_DIR..."

# Clean existing bundle
rm -rf "$MCP_SERVER_DIR"
mkdir -p "$MCP_SERVER_DIR"

# Copy necessary files
cp -r "$CONTEXTBUDDY_DIR/dist" "$MCP_SERVER_DIR/"
cp -r "$CONTEXTBUDDY_DIR/web" "$MCP_SERVER_DIR/"
cp "$CONTEXTBUDDY_DIR/package.json" "$MCP_SERVER_DIR/"

# Install production dependencies only
cd "$MCP_SERVER_DIR"
npm install --omit=dev

echo "MCP server bundled successfully!"
