# GeoTime - Employee Time Tracking & Management System

A comprehensive web application for employee time tracking, geolocation-based attendance, and workforce management with advanced features for both employees and team leaders.

## 🌟 Key Features

### 📱 **Multi-Platform Support**
- **Desktop Dashboard** - Full-featured interface for comprehensive management
- **Mobile Dashboard** - Optimized mobile interface for on-the-go time tracking
- **Responsive Design** - Seamless experience across all devices
- **View Toggle** - Easy switching between mobile and full views

### ⏰ **Advanced Time Tracking**
- **Real-time Clock In/Out** - GPS-based attendance tracking
- **Geofencing Validation** - Location-based attendance verification
- **Overtime Management** - Automatic overtime calculation and alerts
- **Session Management** - Active work session tracking
- **Break Time Tracking** - Flexible break time management

### 📊 **Comprehensive Reporting**
- **Employee Reports** - Individual time tracking and analysis
- **Team Leader Reports** - Team-wide analytics and insights
- **Time Correction Requests** - Employee-initiated time adjustments
- **Overtime Analysis** - Detailed overtime tracking and reporting
- **Location History** - Complete attendance location tracking

### 📋 **Request Management System**
- **Leave Requests** - Vacation, sick leave, and personal time off
- **Overtime Requests** - Pre-approval for additional work hours
- **Schedule Change Requests** - Shift modification requests
- **Time Correction Requests** - Attendance record adjustments
- **Approval Workflows** - Team leader approval system

### 🎯 **Role-Based Access**
- **Employee Interface** - Time tracking, requests, and personal reports
- **Team Leader Interface** - Team management, approvals, and analytics
- **Admin Panel** - System-wide configuration and user management

### 🔒 **Security & Compliance**
- **Geolocation Validation** - GPS-based attendance verification
- **Secure Authentication** - JWT-based user authentication
- **Role-Based Permissions** - Granular access control
- **Audit Trails** - Complete activity logging
- **Data Encryption** - Secure data transmission and storage

## 🛠️ Tech Stack

### **Backend**
- **Django** - Robust web framework
- **Django REST Framework** - RESTful API development
- **PostgreSQL** - Reliable database system
- **Celery** - Background task processing
- **Redis** - Caching and session management
- **Gunicorn** - Production WSGI server

### **Frontend**
- **React** - Modern user interface
- **React Query** - Advanced data fetching and caching
- **Tailwind CSS** - Utility-first styling
- **React Router** - Client-side routing
- **Axios** - HTTP client
- **Leaflet** - Interactive maps

### **Infrastructure**
- **Nginx** - Reverse proxy and static file serving
- **Docker** - Containerization (optional)
- **SSL/TLS** - Secure HTTPS communication
- **Cron Jobs** - Automated tasks and backups

## 📁 Project Structure

```
geoTime/
├── backend/                          # Django backend
│   ├── backend/                      # Django settings
│   ├── geo/                          # Main app
│   │   ├── models.py                 # Database models
│   │   ├── views.py                  # API views
│   │   ├── serializers.py            # Data serialization
│   │   └── management/               # Custom commands
│   ├── manage.py                     # Django management
│   └── requirements.txt              # Python dependencies
├── frontend/                         # React frontend
│   ├── src/
│   │   ├── dashboards/               # Dashboard components
│   │   │   ├── EmployeeDashboard/    # Employee interface
│   │   │   ├── TeamLeaderDashboard/  # Team leader interface
│   │   │   └── MobileDashboard/      # Mobile interface
│   │   ├── EmployeeRequest/          # Request management
│   │   ├── Employee_Report/          # Employee reports
│   │   ├── TeamLeader_Report/        # Team leader reports
│   │   ├── TeamLeaderApproval/       # Approval workflows
│   │   ├── components/               # Reusable components
│   │   └── utils/                    # Utility functions
│   ├── package.json                  # Node.js dependencies
│   └── tailwind.config.js            # Tailwind configuration
├── COMPREHENSIVE_DEPLOYMENT_GUIDE.md # Deployment documentation
├── setup_test_data.py                # Test data creation
└── README.md                         # This file
```

## 🚀 Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Redis (optional)

### Backend Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/geoTime.git
   cd geoTime
   ```

2. **Set up Python environment:**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Configure database:**
   ```bash
   # Create PostgreSQL database
   createdb geotime_dev
   
   # Run migrations
   python manage.py migrate
   
   # Create superuser
   python manage.py createsuperuser
   ```

4. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start the backend server:**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Install dependencies:**
   ```bash
   cd frontend
   npm install
   ```

2. **Start development server:**
   ```bash
   npm start
   ```

3. **Build for production:**
   ```bash
   npm run build
   ```

## 📱 Dashboard Features

### **Employee Dashboard**
- **Time Tracking** - Clock in/out with GPS validation
- **Current Status** - Real-time work session information
- **Today's Timeline** - Complete daily activity overview
- **Location Map** - Interactive map with geofencing
- **Overtime Alerts** - Automatic overtime notifications
- **Quick Actions** - Fast access to common tasks

### **Mobile Dashboard**
- **Simplified Interface** - Touch-optimized design
- **Quick Clock In/Out** - One-tap time tracking
- **Location Status** - Real-time GPS information
- **Map View** - Location tracking with geofencing
- **Offline Support** - Basic functionality without internet
- **Push Notifications** - Important alerts and reminders

### **Team Leader Dashboard**
- **Team Overview** - Complete team status at a glance
- **Member Management** - Individual employee tracking
- **Approval Center** - Pending request management
- **Reports & Analytics** - Team performance insights
- **Geolocation Tracking** - Real-time team location
- **Time Entry Management** - Manual time adjustments

## 📋 Request System

### **Leave Requests**
- **Vacation Time** - Planned time off requests
- **Sick Leave** - Health-related absences
- **Personal Time** - Emergency or personal leave
- **Approval Workflow** - Team leader review process
- **Status Tracking** - Request status updates

### **Overtime Requests**
- **Pre-approval** - Advance overtime authorization
- **Reason Documentation** - Detailed justification
- **Duration Specification** - Hours and dates
- **Approval Process** - Manager review and approval
- **Integration** - Automatic overtime tracking

### **Schedule Change Requests**
- **Shift Modifications** - Time or date changes
- **Flexible Scheduling** - Alternative work arrangements
- **Reason Documentation** - Change justification
- **Approval Workflow** - Manager review process
- **Calendar Integration** - Schedule updates

### **Time Correction Requests**
- **Attendance Adjustments** - Fix clock in/out errors
- **Missing Entries** - Add forgotten time entries
- **Documentation** - Supporting evidence upload
- **Approval Process** - Manager verification
- **Audit Trail** - Complete correction history

## 📊 Reporting & Analytics

### **Employee Reports**
- **Personal Time Summary** - Individual work statistics
- **Overtime Analysis** - Personal overtime tracking
- **Attendance History** - Complete time entry records
- **Location Reports** - Work location analysis
- **Export Options** - PDF and CSV downloads

### **Team Leader Reports**
- **Team Performance** - Overall team statistics
- **Individual Analytics** - Employee-specific insights
- **Overtime Summary** - Team overtime analysis
- **Attendance Patterns** - Work pattern identification
- **Custom Date Ranges** - Flexible reporting periods

## 🔧 API Endpoints

### **Authentication**
- `POST /api/token/` - User login
- `POST /api/token/refresh/` - Token refresh
- `POST /api/logout/` - User logout

### **Time Tracking**
- `POST /api/time-in/` - Clock in
- `POST /api/time-out/` - Clock out
- `GET /api/time-entries/` - Get time entries
- `GET /api/current-session/` - Get active session

### **Requests**
- `GET /api/leave-requests/` - Get leave requests
- `POST /api/leave-requests/` - Create leave request
- `GET /api/overtime-requests/` - Get overtime requests
- `POST /api/overtime-requests/` - Create overtime request
- `GET /api/schedule-requests/` - Get schedule requests
- `POST /api/schedule-requests/` - Create schedule request

### **Reports**
- `GET /api/employee-reports/` - Employee reports
- `GET /api/team-reports/` - Team leader reports
- `GET /api/time-corrections/` - Time correction requests

## 🚀 Deployment

For detailed deployment instructions, see [COMPREHENSIVE_DEPLOYMENT_GUIDE.md](COMPREHENSIVE_DEPLOYMENT_GUIDE.md).

### **Quick Deployment**
```bash
# Backend
cd backend
python manage.py collectstatic
gunicorn backend.wsgi:application

# Frontend
cd frontend
npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the deployment guide for common issues
- Review the troubleshooting section in the documentation

## 🔄 Version History

- **v2.0** - Added mobile dashboard, request system, and advanced reporting
- **v1.5** - Enhanced geofencing and overtime management
- **v1.0** - Initial release with basic time tracking

---

**GeoTime** - Modern employee time tracking and management solution. 