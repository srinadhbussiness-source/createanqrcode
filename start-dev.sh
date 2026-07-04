#!/bin/bash
# Persistent dev server launcher with auto-restart.
cd /home/z/my-project

# Kill any existing dev server
pkill -f "next dev -p 3000" 2>/dev/null
pkill -f "next-server" 2>/dev/null
sleep 1

# Restart loop
while true; do
  echo "[$(date)] Starting next dev..." >> /home/z/my-project/dev-runner.log
  bun run dev >> /home/z/my-project/dev.log 2>&1 &
  DEV_PID=$!
  echo "$DEV_PID" > /home/z/my-project/.zscripts/dev.pid
  wait $DEV_PID
  echo "[$(date)] next dev exited (code $?), restarting in 2s..." >> /home/z/my-project/dev-runner.log
  sleep 2
done
