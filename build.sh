#!/bin/bash

# Use the build-specific tool-versions
cp .tool-versions.build .tool-versions

# Copy the build-specific package.json
cp package.build.json package.json

# Install dependencies and build
npm install
npm run build
