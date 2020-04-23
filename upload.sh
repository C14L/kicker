#!/bin/bash

SRC=$(cd "$( dirname "$0" )"; pwd)
SVR="cst@89.110.147.123"
DST="$SVR:/opt/"

echo "${SRC} >>> ${DST}"
read -rsp "Press [ENTER] to start..."

rsync -rtvP \
    --delete \
    --exclude=__pycache__ \
    --exclude=*.swp \
    --exclude=*.log \
    --exclude=*.pyc \
    --exclude=db.sqlite3 \
    ${SRC} ${DST}

pass webdev/v874-server | head -n1 | ssh -tt ${SVR} \
    "sudo supervisorctl restart kicker && sudo service nginx restart"
