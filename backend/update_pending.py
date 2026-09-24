from database import SessionLocal
from models import Member, Subscription

db = SessionLocal()

changes = {
    13: 1500,  # Umer Javed: Rs.4500 pending
    14: 4500,  # Muhammad Umer: Rs.1500 pending
    15: 2500,  # Jamal: Rs.1500 pending
    16: 500,   # Rustgaar: Rs.3500 pending
}

for member_id, new_paid in changes.items():
    member = db.query(Member).filter(Member.id == member_id).first()
    if member:
        for sub in member.subscriptions:
            pending = sub.total_fee - sub.discount - sub.paid_amount
            if pending > 0:
                sub.paid_amount = new_paid
                print(f"{member.name}: paid={new_paid}, pending={sub.total_fee - sub.discount - new_paid}")
                break

db.commit()
db.close()
print("Done.")
