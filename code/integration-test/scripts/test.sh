#!/usr/bin/env bash
echo starting services
docker compose up >& .buildsystem/servers.log &

npx playwright test

result=$?

echo stopping services
docker compose down >> .buildsystem/servers.log 2>&1

exit $result