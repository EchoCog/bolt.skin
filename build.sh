#!/bin/bash

# Remove the .tool-versions file to prevent asdf from trying to use pnpm
rm -f .tool-versions

# Copy the build-specific package.json
cp package.build.json package.json

# Install dependencies and build
npm install
npm run build
