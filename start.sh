#!/bin/bash 

touch .env 

redis-server & 

node --env-file=.env dist/index.js 
