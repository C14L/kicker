from django.conf import settings
from django.http.response import HttpResponse

# We don't need any template engine functionality here,
# so keep it simple and just return static html files
# with embedded css and js.

def getcontents(filename):
    with open(filename, "r") as fh:
        return "".join(fh.readlines())


def home(request):
    return HttpResponse(getcontents(settings.KICKER_HOME_FILE))


def user(request, game_id):
    return HttpResponse(getcontents(settings.KICKER_USER_FILE))


def game(request, game_id, username):
    html = getcontents(settings.KICKER_HTML_FILE)
    css = "<style>" + getcontents(settings.KICKER_CSS_FILE) + "</style>"
    js = "<script>" + getcontents(settings.KICKER_JS_FILE) + "</script>"
    return HttpResponse(html + css + js)
