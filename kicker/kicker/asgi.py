import os
import logging;

from django.core.asgi import get_asgi_application
from kicker.websocket import websocket_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'kicker.settings')

django_application = get_asgi_application()

log = logging.getLogger(__name__)

async def application(scope, receive, send):
    if scope['type'] == 'http':
        await django_application(scope, receive, send)
    elif scope['type'] == 'websocket':
        print("Received websocket type!!")
        log.info("Received websocket type!!")
        await websocket_application(scope, receive, send)
    else:
        raise NotImplementedError(f"Unknown scope type {scope['type']}")
