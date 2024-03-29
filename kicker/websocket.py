import json
import logging
from copy import deepcopy
from collections import defaultdict

log = logging.getLogger(__name__)

global_scope = defaultdict(dict)

game_init = {
    'users': [],  # list of 4 user names
    'connections': [],  # list of 4 user send methods
}


async def websocket_application(scope, receive, send):
    _global_scope = globals()['global_scope']

    while True:
        _user = {
            "id": None,
        }
        event = await receive()
        log.debug(event)
        log.debug(_user["id"])

        if event['type'] == 'websocket.connect':
            await send({'type': 'websocket.accept'})
            log.debug("### CONNECT ###")

        if event['type'] == 'websocket.disconnect':
            log.debug("### DISCONNECT ###")
            log.debug(_global_scope)
            user_id = _global_scope['connections'][send]
            log.debug(user_id)
            game_id = _global_scope['users'][user_id]
            log.debug(game_id)
            _global_scope['games'][game_id]['users'].remove(user_id)
            _global_scope['games'][game_id]['connections'].remove(send)
            del _global_scope['connections'][send]
            del _global_scope['users'][user_id]
            log.debug(_global_scope)
            # Tell the others that this user just disconnected
            await ws_send(_global_scope['games'][game_id]['connections'], {
                'action': 'userlist',
                'userlist': _global_scope['games'][game_id]['users'],
            })
            break

        if event['type'] == 'websocket.receive':
            log.debug("### RECEIVE ###")

            if event['text'] == 'ping':
                await ws_send(send, 'pong')

            else:
                data = json.loads(event['text'])

                if data['action'] == 'register':
                    game_id = data['game']
                    user_id = data['user']
                    _user["id"] = user_id

                    if game_id not in _global_scope['games']:
                        _global_scope['games'][game_id] = deepcopy(game_init)

                    if len(_global_scope['games'][game_id]['users']) == 4:
                        await ws_send(send, {
                            'action': 'exception',
                            'exception': 'game has already 4 users',
                        })
                    else:
                        if user_id not in _global_scope['games'][game_id]['users']:
                            _global_scope['games'][game_id]['users'].append(user_id)
                            _global_scope['games'][game_id]['connections'].append(send)
                            _global_scope['connections'][send] = user_id
                            _global_scope['users'][user_id] = game_id

                        await ws_send(_global_scope['games'][game_id]['connections'], {
                            'action': 'userlist',
                            'userlist': _global_scope['games'][game_id]['users'],
                        })
                else:
                    await ws_send(_global_scope['games'][game_id]['connections'], data)

            log.debug(global_scope)


async def ws_send(send, data):
    if not isinstance(data, str):
        data = json.dumps(data)
    if not isinstance(send, list):
        send = [send]

    for _send in send:
        await _send({'type': 'websocket.send', 'text': data})
