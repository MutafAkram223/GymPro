import random
from datetime import date, timedelta
import calendar
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

names = [
    "Mutaf", "Saad", "Amaan", "Ali Hassaan", "Hassan", "Farhan", 
    "Ahmad Cheema", "Malik Ihtesham", "Sauban", "Ali Zahid", 
    "Mateen", "Amir", "Umer Javed", "Muhammad Umer", "Jamal", "Rustgaar"
]

def add_months(sourcedate, months):
    month = sourcedate.month - 1 + months
    year = sourcedate.year + month // 12
    month = month % 12 + 1
    day = min(sourcedate.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)

def seed_data():
    db = SessionLocal()
    
    # Clear existing data to ensure a fresh mix
    db.query(models.Subscription).delete()
    db.query(models.Attendance).delete()
    db.query(models.Member).delete()
    db.commit()

    today = date.today()
    print("Seeding diverse test cases...")
    
    for i, name in enumerate(names):
        member = models.Member(
            name=name,
            phone=f"03{random.randint(0,4)}{random.randint(1000000,9999999)}",
            join_date=today, # Will override below
            active=True
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        
        # Determine case type based on index
        # 0-5: Active
        # 6-9: Pending (1-7 days overdue)
        # 10-13: Overdue (8+ days overdue)
        # 14-15: Gap history (Joined 5 months ago, missed some months)
        
        if i <= 5: # Active
            join_date = add_months(today, -2)
            member.join_date = join_date
            
            # Active sub
            sub = models.Subscription(
                member_id=member.id,
                start_date=add_months(today, -1),
                end_date=add_months(today, 2),
                months=3,
                total_fee=6000,
                discount=0,
                paid_amount=6000
            )
            db.add(sub)
            
        elif i <= 9: # Pending
            join_date = add_months(today, -3)
            member.join_date = join_date
            
            # Sub that ended 3 days ago
            sub_end = today - timedelta(days=3)
            sub_start = add_months(sub_end, -1)
            
            sub = models.Subscription(
                member_id=member.id,
                start_date=sub_start,
                end_date=sub_end,
                months=1,
                total_fee=2000,
                discount=0,
                paid_amount=2000
            )
            db.add(sub)
            
        elif i <= 13: # Overdue
            join_date = add_months(today, -6)
            member.join_date = join_date
            
            # Sub that ended 45 days ago
            sub_end = today - timedelta(days=45)
            sub_start = add_months(sub_end, -3)
            
            sub = models.Subscription(
                member_id=member.id,
                start_date=sub_start,
                end_date=sub_end,
                months=3,
                total_fee=6000,
                discount=0,
                paid_amount=3000 # Partial payment
            )
            db.add(sub)
            
        else: # Gap history
            join_date = add_months(today, -5)
            member.join_date = join_date
            
            # Sub for month 1
            sub1 = models.Subscription(
                member_id=member.id,
                start_date=join_date,
                end_date=add_months(join_date, 1),
                months=1,
                total_fee=2000,
                discount=0,
                paid_amount=2000
            )
            db.add(sub1)
            # Nothing for month 2, 3, 4
            # Current active sub
            sub2 = models.Subscription(
                member_id=member.id,
                start_date=add_months(today, -1),
                end_date=add_months(today, 1),
                months=2,
                total_fee=4000,
                discount=0,
                paid_amount=1000
            )
            db.add(sub2)

        db.commit()

    print("Seed complete!")
    db.close()

if __name__ == "__main__":
    seed_data()
