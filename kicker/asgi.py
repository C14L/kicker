import os
import logging;

from django.core.asgi import get_asgi_application
from kicker.websocket import websocket_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kicker.settings')

django_application = get_asgi_application()

log = logging.getLogger(__name__)

log.debug("### Django ASGI loaded.")

async def application(scope, receive, send):
    log.debug("### Django ASGI application called.")

    if scope['type'] == 'http':
        log.debug("### Django ASGI app received a HTTP request.")
        await django_application(scope, receive, send)
    elif scope['type'] == 'websocket':
        log.debug("### Django ASGI app received a WebSocket request.")
        await websocket_application(scope, receive, send)
    else:
        raise NotImplementedError(f"Unknown scope type {scope['type']}")
