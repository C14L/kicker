from django.conf import settings
from django.http.response import HttpResponse

# We don't need any template engine functionality here,
# so keep it simple and just return static html files
# with embedded css and js.

def home(request):
    with open(settings.KICKER_HOME_FILE, "r") as fh:
        html = "".join(fh.readlines())

    return HttpResponse(html)


def game(request, game_id, username):
    with open(settings.KICKER_JS_FILE, "r") as fh:
        js = "".join(fh.readlines())
    with open(settings.KICKER_CSS_FILE, "r") as fh:
        css = "".join(fh.readlines())
    with open(settings.KICKER_HTML_FILE, "r") as fh:
        html = "".join(fh.readlines())

    return HttpResponse(
        html + "<style>" + css + "</style>" + "<script>" + js + "</script>"
    )
