#!/bin/bash

# Copy the build-specific package.json
cp package.build.json package.json

# Install dependencies and build
npm install
npm run build
