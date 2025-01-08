#!/bin/bash

# Ensure we're in the right directory
cd "$(dirname "$0")"

# Copy the build-specific package.json
cp package.build.json package.json

# Install dependencies and build
npm install
npm run build
