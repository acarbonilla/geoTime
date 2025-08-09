from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.utils import timezone
from datetime import date
import logging

from .models import TimeEntry, DailyTimeSummary, EmployeeSchedule
from .utils import generate_daily_time_summary_from_entries

logger = logging.getLogger(__name__)

@receiver(post_save, sender=TimeEntry)
def update_daily_summary_on_time_entry_save(sender, instance, created, **kwargs):
    """
    Automatically update the DailyTimeSummary when a TimeEntry is created or updated.
    This ensures that the schedule report shows the latest time-in/time-out data.
    """
    try:
        # Get the date of the time entry (convert to Manila timezone for proper date)
        import pytz
        manila_tz = pytz.timezone('Asia/Manila')
        
        # Handle timezone conversion properly
        if instance.timestamp.tzinfo is None:
            # If timestamp is naive, assume UTC
            utc_timestamp = pytz.UTC.localize(instance.timestamp)
        else:
            utc_timestamp = instance.timestamp
        
        manila_timestamp = utc_timestamp.astimezone(manila_tz)
        entry_date = manila_timestamp.date()
        
        logger.info(f"Updating daily summary for employee {instance.employee.employee_id} on {entry_date} after {'creating' if created else 'updating'} time entry")
        
        # Generate/update the daily summary for this specific date
        result = generate_daily_time_summary_from_entries(
            employee=instance.employee,
            start_date=entry_date,
            end_date=entry_date
        )
        
        logger.info(f"Successfully updated daily summary for {entry_date}: {result}")
        
    except Exception as e:
        logger.error(f"Error updating daily summary for time entry {instance.id}: {str(e)}", exc_info=True)

@receiver(post_delete, sender=TimeEntry)
def update_daily_summary_on_time_entry_delete(sender, instance, **kwargs):
    """
    Automatically update the DailyTimeSummary when a TimeEntry is deleted.
    """
    try:
        # Get the date of the time entry (convert to Manila timezone for proper date)
        import pytz
        manila_tz = pytz.timezone('Asia/Manila')
        
        # Handle timezone conversion properly
        if instance.timestamp.tzinfo is None:
            # If timestamp is naive, assume UTC
            utc_timestamp = pytz.UTC.localize(instance.timestamp)
        else:
            utc_timestamp = instance.timestamp
        
        manila_timestamp = utc_timestamp.astimezone(manila_tz)
        entry_date = manila_timestamp.date()
        
        logger.info(f"Updating daily summary for employee {instance.employee.employee_id} on {entry_date} after deleting time entry")
        
        # Generate/update the daily summary for this specific date
        result = generate_daily_time_summary_from_entries(
            employee=instance.employee,
            start_date=entry_date,
            end_date=entry_date
        )
        
        logger.info(f"Successfully updated daily summary for {entry_date} after deletion: {result}")
        
    except Exception as e:
        logger.error(f"Error updating daily summary after deleting time entry {instance.id}: {str(e)}", exc_info=True)

@receiver(post_save, sender=EmployeeSchedule)
def update_daily_summary_on_schedule_save(sender, instance, created, **kwargs):
    """
    Automatically update the DailyTimeSummary when an EmployeeSchedule is created or updated.
    This ensures that the schedule report shows the latest schedule data.
    """
    try:
        schedule_date = instance.date
        employee = instance.employee
        
        logger.info(f"Updating daily summary for employee {employee.employee_id} on {schedule_date} after {'creating' if created else 'updating'} schedule")
        
        # Generate/update the daily summary for this specific date
        result = generate_daily_time_summary_from_entries(
            employee=employee,
            start_date=schedule_date,
            end_date=schedule_date
        )
        
        logger.info(f"Successfully updated daily summary for {schedule_date} after schedule {'creation' if created else 'update'}: {result}")
        
    except Exception as e:
        logger.error(f"Error updating daily summary for schedule {instance.id}: {str(e)}", exc_info=True)

@receiver(post_delete, sender=EmployeeSchedule)
def update_daily_summary_on_schedule_delete(sender, instance, **kwargs):
    """
    Automatically update the DailyTimeSummary when an EmployeeSchedule is deleted.
    """
    try:
        schedule_date = instance.date
        employee = instance.employee
        
        logger.info(f"Updating daily summary for employee {employee.employee_id} on {schedule_date} after deleting schedule")
        
        # Generate/update the daily summary for this specific date
        result = generate_daily_time_summary_from_entries(
            employee=employee,
            start_date=schedule_date,
            end_date=schedule_date
        )
        
        logger.info(f"Successfully updated daily summary for {schedule_date} after schedule deletion: {result}")
        
    except Exception as e:
        logger.error(f"Error updating daily summary after deleting schedule {instance.id}: {str(e)}", exc_info=True)
