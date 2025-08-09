#!/usr/bin/env python
import os
import sys
import django
from datetime import date

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from geo.models import DailyTimeSummary

# Check UT for August 09
summary = DailyTimeSummary.objects.filter(date=date(2025, 8, 9)).first()

if summary:
    print(f"UT for Aug 09: {summary.undertime_minutes}")
    print(f"BH for Aug 09: {summary.billed_hours}")
    print(f"Scheduled Time In: {summary.scheduled_time_in}")
    print(f"Scheduled Time Out: {summary.scheduled_time_out}")
    print(f"Status: {summary.status}")
else:
    print("No summary found for Aug 09")
