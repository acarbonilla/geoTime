from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LocationViewSet, DepartmentViewSet, EmployeeViewSet,
    DashboardAPIView, SearchAPIView, EmployeeHierarchyAPIView
)

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'employees', EmployeeViewSet, basename='employee')

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('api/', include(router.urls)),
    path('api/dashboard/', DashboardAPIView.as_view(), name='dashboard'),
    path('api/search/', SearchAPIView.as_view(), name='search'),
    path('api/hierarchy/', EmployeeHierarchyAPIView.as_view(), name='hierarchy'),
] 