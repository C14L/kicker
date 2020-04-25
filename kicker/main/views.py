from django.shortcuts import render
from django.http.response import HttpResponse


def home(request):
    return render(request, 'home.html')


def game(request, game_id, username):
    """Serve HTML/JS/CSS during development as a single file."""

    with open('../index.js', 'r') as fh:
        js = ''.join(fh.readlines())
    with open('../index.css', 'r') as fh:
        css = ''.join(fh.readlines())
    with open('../index.html', 'r') as fh:
        html = ''.join(fh.readlines())

    return HttpResponse(html + '<style>' + css + '</style>' + '<script>' + js + '</script>')
