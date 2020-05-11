#!/bin/bash

SRC=$(cd "$( dirname "$0" )"; pwd)
SVR="5.9.58.2"
DST="$SVR:/opt/"

echo "${SRC} >>> ${DST}"
rsync -rtvP --delete --exclude=.git* ${SRC} ${DST}

