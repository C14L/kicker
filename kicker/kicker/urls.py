from django.urls import path
from main import views

urlpatterns = [
    path('', views.home, name='home'),
    path('<str:game_id>/<str:username>', views.game, name='game'),
]
