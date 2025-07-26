from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    LocationViewSet, DepartmentViewSet, EmployeeViewSet,
    DashboardAPIView, SearchAPIView, EmployeeHierarchyAPIView,
    TimeEntryViewSet, TimeInOutAPIView, TimeReportAPIView,
    GeofenceValidationAPIView, LoginAPIView, LogoutAPIView, UserProfileAPIView,
    WorkSessionViewSet,
    ReportDownloadAPIView,
    ReportPreviewAPIView,  # Add this import
    TimeCorrectionRequestViewSet,
    OvertimeRequestViewSet,  # <-- Add this import
    LeaveRequestViewSet,  # <-- Add this import
    ChangeScheduleRequestViewSet,  # <-- Add this import
    tl_departments_and_locations,
)
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'locations', LocationViewSet, basename='location')
router.register(r'departments', DepartmentViewSet, basename='department')
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'time-entries', TimeEntryViewSet, basename='timeentry')
router.register(r'work-sessions', WorkSessionViewSet, basename='worksession')
router.register(r'time-correction-requests', TimeCorrectionRequestViewSet, basename='timecorrectionrequest')
router.register(r'overtime-requests', OvertimeRequestViewSet, basename='overtimerequest')
router.register(r'leave-requests', LeaveRequestViewSet, basename='leaverequest')
router.register(r'change-schedule-requests', ChangeScheduleRequestViewSet, basename='changeschedulerequest')

# The API URLs are now determined automatically by the router
urlpatterns = [
    # Authentication endpoints
    path('api/login/', LoginAPIView.as_view(), name='login'),
    path('api/logout/', LogoutAPIView.as_view(), name='logout'),
    
    # JWT endpoints
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    
    # API endpoints
    path('api/', include(router.urls)),
    path('api/dashboard/', DashboardAPIView.as_view(), name='dashboard'),
    path('api/search/', SearchAPIView.as_view(), name='search'),
    path('api/hierarchy/', EmployeeHierarchyAPIView.as_view(), name='hierarchy'),
    path('api/time-in/', TimeInOutAPIView.as_view(), {'action': 'time-in'}, name='time-in'),
    path('api/time-out/', TimeInOutAPIView.as_view(), {'action': 'time-out'}, name='time-out'),
    path('api/time-reports/', TimeReportAPIView.as_view(), name='time-reports'),
    path('api/geofence/validate/', GeofenceValidationAPIView.as_view(), name='geofence-validate'),
    path('api/tl-departments-locations/', tl_departments_and_locations, name='tl_departments_and_locations'),
] 
urlpatterns += [
    path('api/reports/download/', ReportDownloadAPIView.as_view(), name='report-download'),
    path('api/reports/preview/', ReportPreviewAPIView.as_view(), name='report-preview'),
] 