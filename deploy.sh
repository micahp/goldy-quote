#!/bin/bash
set -e

cd /root/goldy-quote
npm run build:all
chmod -R o+r /root/goldy-quote/dist
systemctl restart goldy-quote
echo "Deploy complete."
