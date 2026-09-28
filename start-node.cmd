@echo off
set PORT=8011
cd /d "C:\planificador-v2 - node"
"C:\node-portable\node.exe" server\server.js >> node-out.log 2>> node-err.log
