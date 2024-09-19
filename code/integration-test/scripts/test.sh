#!/usr/bin/env bash
docker compose up -d

npx playwright test

result=$?

docker compose down

exit $result