#!/bin/sh

test $ISDEV && (cd kicker && uvicorn kicker.asgi:application && cd -)

