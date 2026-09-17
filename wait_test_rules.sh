#!/bin/bash
while true; do
  if ! ps aux | grep -v grep | grep "test:rules"; then
    echo "Done"
    break
  fi
  sleep 1
done
