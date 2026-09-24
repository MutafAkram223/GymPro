import random
from datetime import date, timedelta
from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models
import calendar

# Names provided by the user
names = [
    "Mutaf", "Saad", "Amaan", "Ali Hassaan", "Hassan", "Farhan", 
    "Ahmad Cheema", "Malik Ihtesham", "Sauban", "Ali Zahid", 
    "Mateen", "Amir", "Umer Javed", "Muhammad Umer", "Jamal", "Rustgaar"
]

def seed_data():
    db = SessionLocal()
    
    # Check if data already exists to avoid duplicates
    if db.query(models.Member).count() > 0:
        print("Database already has members. Skipping seed.")
        db.close()
        return

    today = date.today()
    
    print(f"Seeding {len(names)} members...")
    
    for i, name in enumerate(names):
        # Generate a random join date within the last 6 months
        months_ago = random.randint(0, 5)
        days_ago = random.randint(1, 28)
        
        target_month = today.month - months_ago
        target_year = today.year
        if target_month <= 0:
            target_month += 12
            target_year -= 1
            
        join_date = date(target_year, target_month, days_ago)
        
        # Create Member
        member = models.Member(
            name=name,
            phone=f"03{random.randint(0,4)}{random.randint(1000000,9999999)}",
            join_date=join_date,
            active=True
        )
        db.add(member)
        db.commit()
        db.refresh(member)
        
        # Create Subscription for the member
        months = random.choice([1, 3, 6])
        total_fee = months * 2000 # 2000 per month
        discount = random.choice([0, 500, 1000]) if months > 1 else 0
        
        # Randomly decide if they have pending dues (approx 30% chance)
        is_pending = random.random() < 0.3
        
        if is_pending:
            paid_amount = total_fee - discount - random.randint(500, 1500)
            if paid_amount < 0: paid_amount = 0
        else:
            paid_amount = total_fee - discount
            
        end_month = join_date.month + months
        end_year = join_date.year
        if end_month > 12:
            end_month -= 12
            end_year += 1
            
        # Handle day overflow (e.g., Feb 30 -> Feb 28)
        try:
            end_date = date(end_year, end_month, join_date.day)
        except ValueError:
            end_date = date(end_year, end_month, 28)
            
        sub = models.Subscription(
            member_id=member.id,
            start_date=join_date,
            end_date=end_date,
            months=months,
            total_fee=float(total_fee),
            discount=float(discount),
            paid_amount=float(paid_amount)
        )
        db.add(sub)
        
        # Add some random attendance for the last 5 days
        for d in range(5):
            att_date = today - timedelta(days=d)
            if random.random() < 0.7:  # 70% chance they were present
                att = models.Attendance(
                    member_id=member.id,
                    date=att_date,
                    status="present"
                )
                db.add(att)
            elif random.random() < 0.1: # 10% chance marked absent
                att = models.Attendance(
                    member_id=member.id,
                    date=att_date,
                    status="absent"
                )
                db.add(att)
                
        db.commit()

    print("Seed complete!")
    db.close()

if __name__ == "__main__":
    seed_data()
