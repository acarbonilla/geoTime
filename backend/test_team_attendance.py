#!/usr/bin/env python
"""
Test script to verify team attendance calculation
Run this with: python manage.py shell < test_team_attendance.py
"""

import os
import django
from datetime import datetime, timedelta
from django.db.models import Q

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from django.utils import timezone
from geo.models import Employee, TimeEntry
from geo.views import DashboardAPIView

def test_team_attendance():
    """Test the team attendance calculation"""
    print("Testing Team Attendance Calculation...")
    print("=" * 50)
    
    # Get a team leader
    team_leaders = Employee.objects.filter(role='team_leader')
    if not team_leaders.exists():
        print("❌ No team leaders found in the database")
        return
    
    team_leader = team_leaders.first()
    print(f"👤 Testing with Team Leader: {team_leader.full_name}")
    
    # Get team members
    team_members = team_leader.get_team_members()
    print(f"👥 Team Members Count: {team_members.count()}")
    
    if team_members.exists():
        print("\nTeam Members:")
        for member in team_members:
            print(f"  - {member.full_name} (ID: {member.id})")
    
    # Get today's date
    today = timezone.now().date()
    yesterday = today - timedelta(days=1)
    print(f"\n📅 Today: {today}")
    print(f"📅 Yesterday: {yesterday}")
    
    # Check time entries for each team member
    print("\n📊 Time Entry Analysis:")
    print("-" * 40)
    
    present_count = 0
    absent_count = 0
    active_count = 0
    
    for member in team_members:
        # Get today's entries
        today_entries = TimeEntry.objects.filter(
            employee=member
        ).filter(
            Q(timestamp__date=today) | Q(event_time__date=today)
        ).order_by('timestamp')
        
        # Get yesterday's entries
        yesterday_entries = TimeEntry.objects.filter(
            employee=member
        ).filter(
            Q(timestamp__date=yesterday) | Q(event_time__date=yesterday)
        ).order_by('timestamp')
        
        print(f"\n👤 {member.full_name}:")
        
        if today_entries.exists():
            present_count += 1
            print(f"  ✅ Present today - {today_entries.count()} entries")
            
            # Check if currently active
            is_active = False
            
            # Check for open session from yesterday (night shift)
            if yesterday_entries.exists():
                last_yest_in = yesterday_entries.filter(entry_type='time_in').last()
                last_yest_out = yesterday_entries.filter(entry_type='time_out').last()
                if last_yest_in and (not last_yest_out or last_yest_out.timestamp < last_yest_in.timestamp):
                    # Check if there's a time-out today after the yesterday time-in
                    today_out = today_entries.filter(entry_type='time_out', timestamp__gt=last_yest_in.timestamp).first()
                    if not today_out:
                        is_active = True
                        print(f"  🌙 Active from yesterday (night shift)")
            
            # Check for open session today
            if today_entries.exists():
                last_today_in = today_entries.filter(entry_type='time_in').last()
                last_today_out = today_entries.filter(entry_type='time_out').last()
                if last_today_in and (not last_today_out or last_today_out.timestamp < last_today_in.timestamp):
                    is_active = True
                    print(f"  🟢 Active today (clocked in)")
            
            if is_active:
                active_count += 1
                print(f"  🔴 Currently ACTIVE")
            else:
                print(f"  ⚫ Not currently active")
            
            # Show entry details
            for entry in today_entries:
                print(f"    {entry.entry_type}: {entry.timestamp.strftime('%H:%M:%S')}")
                
        else:
            absent_count += 1
            print(f"  ❌ Absent today - no entries")
    
    print("\n" + "=" * 50)
    print("📈 SUMMARY:")
    print(f"Total Team Members: {team_members.count()}")
    print(f"Present Today: {present_count}")
    print(f"Absent Today: {absent_count}")
    print(f"Currently Active: {active_count}")
    print("=" * 50)
    
    # Test the actual API method
    print("\n🧪 Testing API Method...")
    try:
        # Create a mock request object
        from django.test import RequestFactory
        from django.contrib.auth.models import User
        
        # Get the team leader's user
        user = team_leader.user
        factory = RequestFactory()
        request = factory.get('/dashboard/')
        request.user = user
        
        # Create dashboard view instance
        dashboard_view = DashboardAPIView()
        
        # Test the team attendance method directly
        team_attendance = dashboard_view._get_team_attendance(team_members)
        
        print("✅ API Method Results:")
        print(f"  Present: {team_attendance['present']}")
        print(f"  Absent: {team_attendance['absent']}")
        print(f"  Active: {team_attendance['active']}")
        print(f"  Late: {team_attendance['late']}")
        
        # Verify counts match
        if (team_attendance['present'] == present_count and 
            team_attendance['absent'] == absent_count and 
            team_attendance['active'] == active_count):
            print("✅ All counts match! API is working correctly.")
        else:
            print("❌ Count mismatch detected!")
            print(f"  Expected: Present={present_count}, Absent={absent_count}, Active={active_count}")
            print(f"  Got: Present={team_attendance['present']}, Absent={team_attendance['absent']}, Active={team_attendance['active']}")
            
    except Exception as e:
        print(f"❌ Error testing API method: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_team_attendance()
