#!/bin/bash

echo "===== Starting selective port cleanup ====="

# Define which ports to protect (add your active connection port here)
# This will be the port you want to keep active
read -p "Enter the active port to preserve (leave empty to auto-detect): " ACTIVE_PORT

# If no port was specified, try to auto-detect an active connection
if [ -z "$ACTIVE_PORT" ]; then
  echo "No active port specified. Trying to auto-detect..."
  # Look for established connections (not just LISTEN)
  ACTIVE_PORTS=$(lsof -i -sTCP:ESTABLISHED | grep -E ':(3[0-9]{3}|4[0-9]{3}|5[0-9]{3}|8[0-9]{3})' | awk '{print $9}' | sed 's/.*://' | sort | uniq)

  if [ ! -z "$ACTIVE_PORTS" ]; then
    echo "Found potentially active ports: $ACTIVE_PORTS"
    ACTIVE_PORT=$(echo $ACTIVE_PORTS | awk '{print $1}')
    echo "Auto-detected active port: $ACTIVE_PORT"
  else
    echo "No active connections detected in the common development port ranges."
  fi
fi

# Define common development port ranges
STANDARD_PORTS=(3000 5000 5173 5174 5175 5176 5177 5178 5179 5180 8000 8080)

# Kill specific common development ports, but preserve active port
echo "Checking standard development ports..."
for PORT in "${STANDARD_PORTS[@]}"; do
  # Skip if this is our active port
  if [ "$PORT" = "$ACTIVE_PORT" ]; then
    echo "Preserving active port $PORT"
    continue
  fi

  PID=$(lsof -ti:$PORT 2>/dev/null)
  if [ ! -z "$PID" ]; then
    echo "Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null
  fi
done

# Kill Node.js processes that are listening on common dev ports
echo "Cleaning up Node.js processes on common development ports (3000-8999)..."
NODE_PIDS=$(ps aux | grep node | grep -v grep | awk '{print $2}')

if [ ! -z "$NODE_PIDS" ]; then
  for PID in $NODE_PIDS; do
    # Check if this Node process is listening on a development port
    PORT=$(lsof -Pan -p $PID -i | grep LISTEN | grep -E ':(3[0-9]{3}|4[0-9]{3}|5[0-9]{3}|8[0-9]{3})' | awk '{print $9}' | sed 's/.*://')

    # Skip if this is our active port
    if [ "$PORT" = "$ACTIVE_PORT" ]; then
      echo "Preserving Node.js process on active port $PORT (PID: $PID)"
      continue
    fi

    if [ ! -z "$PORT" ]; then
      echo "Killing Node.js process listening on port $PORT (PID: $PID)"
      kill -9 $PID 2>/dev/null
    fi
  done
fi

# Find and kill ANY process on development ports, but preserve active port
echo "Checking for any remaining processes on development ports..."
DEV_PORT_PIDS=$(lsof -i -sTCP:LISTEN | grep -E ':(3[0-9]{3}|4[0-9]{3}|5[0-9]{3}|8[0-9]{3})' | awk '{print $2}' | sort | uniq)

if [ ! -z "$DEV_PORT_PIDS" ]; then
  for PID in $DEV_PORT_PIDS; do
    PORT=$(lsof -a -p $PID -i -sTCP:LISTEN | grep -E ':(3[0-9]{3}|4[0-9]{3}|5[0-9]{3}|8[0-9]{3})' | awk '{print $9}' | sed 's/.*://' | head -1)

    # Skip if this is our active port
    if [ "$PORT" = "$ACTIVE_PORT" ]; then
      echo "Preserving process on active port $PORT (PID: $PID)"
      continue
    fi

    echo "Killing process on port $PORT (PID: $PID)"
    kill -9 $PID 2>/dev/null
  done
fi

# Now clean up VS Code forwarded ports that don't have active processes
echo "Cleaning up VS Code forwarded ports without active processes..."

# Get all forwarded ports from the VS Code port forwarding feature
# Unfortunately, direct CLI access to VS Code's port forwarding is limited
# So we'll kill the processes and let VS Code clean up after itself

# Final verification
REMAINING=$(lsof -i -sTCP:LISTEN | grep -E ':(3[0-9]{3}|4[0-9]{3}|5[0-9]{3}|8[0-9]{3})')
if [ ! -z "$REMAINING" ]; then
  echo "Remaining processes after cleanup:"
  echo "$REMAINING"

  if echo "$REMAINING" | grep -q "$ACTIVE_PORT"; then
    echo "✅ Successfully preserved active port $ACTIVE_PORT"
  else
    echo "❌ Warning: Active port $ACTIVE_PORT was not found in remaining processes."
  fi
else
  if [ ! -z "$ACTIVE_PORT" ]; then
    echo "⚠️ No listening processes remain on development ports, including active port $ACTIVE_PORT."
  else
    echo "All development port processes terminated as requested."
  fi
fi

echo "===== Port cleanup complete ====="
echo "Note: You may need to manually close any remaining forwarded ports"
echo "in the VS Code 'PORTS' panel that don't have associated processes."
