#!/bin/bash

NAME="kicker_app"
DJANGODIR=/opt/kicker/kicker
SOCKFILE=/opt/kicker/run/gunicorn.sock
VENVDIR=/opt/venvs/kicker

echo "Starting gateway $NAME as $(whoami)..."

cd $DJANGODIR
source $VENVDIR/bin/activate
export DJANGO_SETTINGS_MODULE='kickerserver.settings'
export PYTHONPATH=${DJANGODIR}:${PYTHONPATH}

RUNDIR=$(dirname ${SOCKFILE})
test -d ${RUNDIR} || mkdir -p ${RUNDIR}

NUM_WORKERS=2  # total workers, ~ 2-4 x number of cores
NUM_THREADS=8  # threads per worker, ~ 2-4 x number of cores

exec $VENVDIR/bin/uvicorn kicker.asgi:application \
  --name ${NAME} \
  --workers ${NUM_WORKERS} \
  --threads ${NUM_THREADS} \
  --bind=unix:${SOCKFILE} \
  --user=cst --group=cst \
  --log-level=info --log-file=-

echo "uvicorn started."
