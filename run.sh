#!/bin/sh

test $ISDEV && uvicorn kicker.asgi:application
