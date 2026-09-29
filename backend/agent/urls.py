from django.urls import path
from .views import (
    AskView, DashboardView, WhyChainView,
    RiskRadarView, KnowledgeGapsView, ConflictsView,
    FreshnessView, WhoKnowsView, WhatChangedView,
    HealthView, OnboardingView, HandoverView,
    DecisionEvolutionView, ImpactAnalysisView,
)

urlpatterns = [
    path('ask', AskView.as_view()),
    path('dashboard', DashboardView.as_view()),
    path('why-chain', WhyChainView.as_view()),
    path('risk-radar', RiskRadarView.as_view()),
    path('knowledge-gaps', KnowledgeGapsView.as_view()),
    path('conflicts', ConflictsView.as_view()),
    path('freshness', FreshnessView.as_view()),
    path('who-knows', WhoKnowsView.as_view()),
    path('what-changed', WhatChangedView.as_view()),
    path('health', HealthView.as_view()),
    path('onboarding', OnboardingView.as_view()),
    path('handover', HandoverView.as_view()),
    path('decision-evolution', DecisionEvolutionView.as_view()),
    path('impact', ImpactAnalysisView.as_view()),
]
