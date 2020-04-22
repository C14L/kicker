#!/bin/sh

(cd kicker && uvicorn kicker.asgi:application && cd -)

