from django.urls import path
from .views import MemoryRetainView, MemoryRecallView, MemoryListView, MemoryDetailView, TimelineView

urlpatterns = [
    path('retain', MemoryRetainView.as_view()),
    path('recall', MemoryRecallView.as_view()),
    path('timeline/events', TimelineView.as_view()),
    path('', MemoryListView.as_view()),
    path('<str:memory_id>', MemoryDetailView.as_view()),
]
