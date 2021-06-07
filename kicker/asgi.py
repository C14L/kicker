import os
import logging;

from django.core.asgi import get_asgi_application
from kicker.websocket import websocket_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kicker.settings')

django_application = get_asgi_application()

logger = logging.getLogger(__name__)

logger.info("### Django ASGI loaded.")

async def application(scope, receive, send):
    logger.info("### Django ASGI application called.")

    if scope['type'] == 'http':
        logger.info("### Django ASGI app received a HTTP request.")
        await django_application(scope, receive, send)
    elif scope['type'] == 'websocket':
        logger.info("### Django ASGI app received a WebSocket request.")
        await websocket_application(scope, receive, send)
    else:
        raise NotImplementedError(f"Unknown scope type {scope['type']}")
