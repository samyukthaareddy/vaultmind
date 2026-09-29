from django.urls import path, include

urlpatterns = [
    path('api/auth/', include('users.urls')),
    path('api/documents/', include('documents.urls')),
    path('api/memory/', include('memories.urls')),
    path('api/agent/', include('agent.urls')),
    path('api/audit/', include('audit.urls')),
    path('api/admin/', include('users.admin_urls')),
]
