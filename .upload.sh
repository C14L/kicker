#!/bin/bash

SRC=$(cd "$( dirname "$0" )"; pwd)
SVR="5.9.58.2"
DST="$SVR:/var/www/"

echo "${SRC} >>> ${DST}"
rsync -rtvP --delete --exclude=.git* ${SRC} ${DST}

#pass webdev/v874-server | head -n1 | ssh -tt ${SVR} \
#    "sudo supervisorctl restart kicker && sudo service nginx restart"

