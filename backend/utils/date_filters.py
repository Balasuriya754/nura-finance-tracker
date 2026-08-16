from datetime import datetime, timedelta
import calendar
from typing import Tuple, Optional

def get_date_range(
    from_ts: Optional[int] = None, 
    to_ts: Optional[int] = None, 
    preset: Optional[str] = None
) -> Tuple[Optional[int], Optional[int]]:
    """
    Returns a tuple of (start_timestamp_ms, end_timestamp_ms).
    If custom range is provided (from_ts, to_ts), it returns them.
    Otherwise, it calculates the range based on the preset.
    If no preset is provided, returns (None, None) for all time.
    """
    if from_ts is not None and to_ts is not None:
        return from_ts, to_ts
        
    now = datetime.now()
    start_ts = None
    end_ts = None
    
    if preset == 'today':
        start = datetime(now.year, now.month, now.day)
        end = start + timedelta(days=1) - timedelta(milliseconds=1)
        start_ts = int(start.timestamp() * 1000)
        end_ts = int(end.timestamp() * 1000)
        
    elif preset == 'yesterday':
        start = datetime(now.year, now.month, now.day) - timedelta(days=1)
        end = start + timedelta(days=1) - timedelta(milliseconds=1)
        start_ts = int(start.timestamp() * 1000)
        end_ts = int(end.timestamp() * 1000)
        
    elif preset == 'this_week':
        # Assuming week starts on Monday
        start = datetime(now.year, now.month, now.day) - timedelta(days=now.weekday())
        end = start + timedelta(days=7) - timedelta(milliseconds=1)
        start_ts = int(start.timestamp() * 1000)
        end_ts = int(end.timestamp() * 1000)
        
    elif preset == 'this_month':
        start = datetime(now.year, now.month, 1)
        # End of month
        last_day = calendar.monthrange(now.year, now.month)[1]
        end = datetime(now.year, now.month, last_day, 23, 59, 59, 999000)
        start_ts = int(start.timestamp() * 1000)
        end_ts = int(end.timestamp() * 1000)
        
    elif preset == 'last_month':
        first_day_this_month = datetime(now.year, now.month, 1)
        end = first_day_this_month - timedelta(milliseconds=1)
        start = datetime(end.year, end.month, 1)
        start_ts = int(start.timestamp() * 1000)
        end_ts = int(end.timestamp() * 1000)
        
    elif preset == 'last_3_months':
        # Current month and previous 2 months
        first_day_this_month = datetime(now.year, now.month, 1)
        # Go back 2 more months
        m = now.month - 2
        y = now.year
        if m <= 0:
            m += 12
            y -= 1
        start = datetime(y, m, 1)
        
        last_day = calendar.monthrange(now.year, now.month)[1]
        end = datetime(now.year, now.month, last_day, 23, 59, 59, 999000)
        
        start_ts = int(start.timestamp() * 1000)
        end_ts = int(end.timestamp() * 1000)
        
    elif preset == 'this_year':
        start = datetime(now.year, 1, 1)
        end = datetime(now.year, 12, 31, 23, 59, 59, 999000)
        start_ts = int(start.timestamp() * 1000)
        end_ts = int(end.timestamp() * 1000)
        
    elif preset == 'all_time':
        return None, None
        
    # Default to this month if preset is unknown but not all_time (or return all_time)
    # Let's return all_time if nothing matches, which means no filtering.
    
    return start_ts, end_ts
