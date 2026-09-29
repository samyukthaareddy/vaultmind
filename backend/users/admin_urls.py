from django.urls import path
from .admin_views import UserListView, UserRoleView

urlpatterns = [
    path('users', UserListView.as_view()),
    path('users/<str:user_id>/role', UserRoleView.as_view()),
]
