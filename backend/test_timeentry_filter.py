#!/usr/bin/env python
"""
Test script to verify TimeEntry filtering is working correctly
"""
import os
import django
from datetime import date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import TimeEntry
from django.utils import timezone

def test_timeentry_filtering():
    print("=== TESTING TIMEENTRY FILTERING ===")
    
    # Get current date
    today = date.today()
    print(f"Today's date: {today}")
    
    # Test filtering by event_time field
    print(f"\n--- Testing event_time filtering for {today} ---")
    
    # Filter by event_time date
    today_entries = TimeEntry.objects.filter(event_time__date=today)
    print(f"Entries with event_time on {today}: {today_entries.count()}")
    
    if today_entries.exists():
        print("Sample entries:")
        for entry in today_entries[:3]:
            print(f"  ID: {entry.id}, Employee: {entry.employee.full_name}, Event Time: {entry.event_time}, Working Date: {entry.working_date}")
    else:
        print("No entries found for today")
    
    # Test filtering by timestamp field (old way)
    print(f"\n--- Testing timestamp filtering for {today} ---")
    timestamp_entries = TimeEntry.objects.filter(timestamp__date=today)
    print(f"Entries with timestamp on {today}: {timestamp_entries.count()}")
    
    if timestamp_entries.exists():
        print("Sample entries:")
        for entry in timestamp_entries[:3]:
            print(f"  ID: {entry.id}, Employee: {entry.employee.full_name}, Timestamp: {entry.timestamp}, Event Time: {entry.event_time}")
    
    # Test working_date property
    print(f"\n--- Testing working_date property ---")
    all_entries = TimeEntry.objects.all()[:5]
    print("Sample entries with working_date:")
    for entry in all_entries:
        print(f"  ID: {entry.id}, Event Time: {entry.event_time}, Working Date: {entry.working_date}, Working Date Str: {entry.working_date_str}")
    
    # Test date range filtering
    print(f"\n--- Testing date range filtering ---")
    yesterday = today - timezone.timedelta(days=1)
    date_range_entries = TimeEntry.objects.filter(
        event_time__date__gte=yesterday,
        event_time__date__lte=today
    )
    print(f"Entries between {yesterday} and {today}: {date_range_entries.count()}")

if __name__ == "__main__":
    test_timeentry_filtering()
