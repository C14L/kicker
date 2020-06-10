from django.urls import path
from main import views

urlpatterns = [
    path('kicker/', views.home, name='home'),
    path('kicker/<str:game_id>/<str:username>', views.game, name='game'),
]
