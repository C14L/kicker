#!/bin/bash

test $ISDEV && daphne -v 2 -b 127.0.0.1 -p 8000 kicker.asgi:application

# test $ISDEV && uvicorn kicker.asgi:application
