#!/usr/bin/env python
import os
import sys
import django
from django.utils import timezone
from datetime import datetime, date

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'backend'))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import TimeCorrectionRequest, TimeEntry, Employee
from django.db.models import Q

def verify_time_correction():
    """Verify that Time Correction is working correctly"""
    print("🔍 VERIFYING TIME CORRECTION FUNCTIONALITY")
    print("=" * 50)
    
    # 1. Check the approved TimeCorrectionRequest
    print("\n📋 1. CHECKING APPROVED TIME CORRECTION REQUEST:")
    try:
        correction_request = TimeCorrectionRequest.objects.filter(
            status='approved'
        ).order_by('-submitted_at').first()
        
        if correction_request:
            print(f"✅ Found approved request: ID {correction_request.id}")
            print(f"   Employee: {correction_request.employee.full_name}")
            print(f"   Date: {correction_request.date}")
            print(f"   Requested Time In: {correction_request.requested_time_in}")
            print(f"   Requested Time Out: {correction_request.requested_time_out}")
            print(f"   Status: {correction_request.status}")
            print(f"   Approved by: {correction_request.reviewed_by.full_name if correction_request.reviewed_by else 'N/A'}")
        else:
            print("❌ No approved TimeCorrectionRequest found")
            return
    except Exception as e:
        print(f"❌ Error checking TimeCorrectionRequest: {e}")
        return
    
    # 2. Check TimeEntry records for the same employee and date
    print("\n📊 2. CHECKING TIMEENTRY RECORDS:")
    employee = correction_request.employee
    target_date = correction_request.date
    
    time_entries = TimeEntry.objects.filter(
        employee=employee
    ).filter(
        Q(timestamp__date=target_date) | Q(event_time__date=target_date)
    ).order_by('timestamp')
    
    print(f"Found {time_entries.count()} TimeEntry records for {employee.full_name} on {target_date}")
    
    for entry in time_entries:
        print(f"   Entry ID: {entry.id}")
        print(f"   Type: {entry.entry_type}")
        print(f"   Timestamp: {entry.timestamp}")
        print(f"   Event Time: {entry.event_time}")
        print(f"   Notes: {entry.notes}")
        print("   ---")
    
    # 3. Verify the corrected times are applied
    print("\n✅ 3. VERIFYING CORRECTED TIMES:")
    if correction_request.requested_time_in:
        time_in_entry = time_entries.filter(entry_type='time_in').first()
        if time_in_entry and time_in_entry.event_time:
            expected_time = timezone.datetime.combine(target_date, correction_request.requested_time_in)
            expected_time = timezone.make_aware(expected_time, timezone=timezone.get_current_timezone())
            
            if time_in_entry.event_time == expected_time:
                print(f"✅ Time In correction applied correctly: {time_in_entry.event_time}")
            else:
                print(f"❌ Time In correction mismatch:")
                print(f"   Expected: {expected_time}")
                print(f"   Actual: {time_in_entry.event_time}")
    
    if correction_request.requested_time_out:
        time_out_entry = time_entries.filter(entry_type='time_out').first()
        if time_out_entry and time_out_entry.event_time:
            expected_time = timezone.datetime.combine(target_date, correction_request.requested_time_out)
            expected_time = timezone.make_aware(expected_time, timezone=timezone.get_current_timezone())
            
            if time_out_entry.event_time == expected_time:
                print(f"✅ Time Out correction applied correctly: {time_out_entry.event_time}")
            else:
                print(f"❌ Time Out correction mismatch:")
                print(f"   Expected: {expected_time}")
                print(f"   Actual: {time_out_entry.event_time}")
    
    # 4. Check if reports would show these entries
    print("\n📈 4. CHECKING REPORT QUERIES:")
    
    # Simulate the report query that includes both timestamp and event_time
    report_entries = TimeEntry.objects.filter(
        employee=employee
    ).filter(
        Q(timestamp__date=target_date) | Q(event_time__date=target_date)
    ).order_by('timestamp')
    
    print(f"Report query finds {report_entries.count()} entries for {target_date}")
    
    for entry in report_entries:
        display_time = entry.event_time if entry.event_time else entry.timestamp
        print(f"   {entry.entry_type}: {display_time.strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 5. Check timezone accuracy
    print("\n🌍 5. CHECKING TIMEZONE ACCURACY:")
    for entry in time_entries:
        if entry.event_time:
            print(f"   Entry {entry.id} ({entry.entry_type}): {entry.event_time}")
            print(f"   Timezone: {entry.event_time.tzinfo}")
            print(f"   UTC Offset: {entry.event_time.utcoffset()}")
    
    print("\n🎉 VERIFICATION COMPLETE!")
    print("=" * 50)

if __name__ == "__main__":
    verify_time_correction() 