from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    HospitalProfileViewSet,
    HospitalFacilityViewSet,
    HospitalAnnouncementViewSet,
    HospitalFAQViewSet,
    PatientFeedbackViewSet,
)

router = DefaultRouter()
router.register(r'facilities', HospitalFacilityViewSet, basename='facility')
router.register(r'announcements', HospitalAnnouncementViewSet, basename='announcement')
router.register(r'faqs', HospitalFAQViewSet, basename='faq')
router.register(r'feedback', PatientFeedbackViewSet, basename='hospital-feedback')
router.register(r'', HospitalProfileViewSet, basename='profile')

feedback_router = DefaultRouter()
feedback_router.register(r'', PatientFeedbackViewSet, basename='feedback')

urlpatterns = [
    path('', include(router.urls)),
]
