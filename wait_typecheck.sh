#!/bin/bash
while true; do
  if ! ps aux | grep -v grep | grep "tsc --noEmit"; then
    echo "Done"
    break
  fi
  sleep 1
done
