from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from datetime import date, timedelta
from typing import List

import models
import schemas
from database import SessionLocal, engine

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Gym Management API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@app.get("/api/members", response_model=List[schemas.Member])
def read_members(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    members = db.query(models.Member).offset(skip).limit(limit).all()
    return members

@app.post("/api/members", response_model=schemas.Member)
def create_member(member: schemas.MemberCreate, db: Session = Depends(get_db)):
    db_member = models.Member(**member.model_dump())
    db.add(db_member)
    db.commit()
    db.refresh(db_member)
    return db_member

@app.post("/api/members/{member_id}/subscriptions", response_model=schemas.Subscription)
def create_subscription(member_id: int, subscription: schemas.SubscriptionCreate, db: Session = Depends(get_db)):
    db_subscription = models.Subscription(**subscription.model_dump(), member_id=member_id)
    db.add(db_subscription)
    db.commit()
    db.refresh(db_subscription)
    return db_subscription

@app.get("/api/dashboard")
def get_dashboard_stats(db: Session = Depends(get_db)):
    total_members = db.query(models.Member).count()
    active_members = db.query(models.Member).filter(models.Member.active == True).count()
    
    subscriptions = db.query(models.Subscription).all()
    pending_fees = sum([(sub.total_fee - sub.discount - sub.paid_amount) for sub in subscriptions])
    
    today = date.today()
    today_attendance = db.query(models.Attendance).filter(models.Attendance.date == today, models.Attendance.status == "present").count()

    members = db.query(models.Member).all()
    
    # Pending clients
    pending_clients = []
    for m in members:
        member_pending = sum([(sub.total_fee - sub.discount - sub.paid_amount) for sub in m.subscriptions])
        if member_pending > 0:
            pending_clients.append({
                "id": m.id,
                "name": m.name,
                "pending_amount": member_pending,
                "phone": m.phone
            })
    
    # Sort and get top clients
    pending_clients.sort(key=lambda x: x["pending_amount"], reverse=True)
    # Return all pending clients instead of just top 5 so they can be tracked
    # (Or limit to a larger number like 20)
    pending_clients = pending_clients[:20]

    import calendar
    # Month wise data (last 6 months)
    revenue_by_month = []
    customers_by_month = []
    
    def get_month_year(d, months_back):
        m = d.month - months_back
        y = d.year
        while m <= 0:
            m += 12
            y -= 1
        return m, y

    for i in range(5, -1, -1):
        target_month, target_year = get_month_year(today, i)
        month_name = calendar.month_abbr[target_month]
        
        month_subs = [s for s in subscriptions if s.start_date.month == target_month and s.start_date.year == target_year]
        month_rev = sum([s.paid_amount for s in month_subs])
        
        month_cust = [m for m in members if m.join_date.month == target_month and m.join_date.year == target_year]
        
        revenue_by_month.append({"month": month_name, "revenue": month_rev})
        customers_by_month.append({"month": month_name, "count": len(month_cust)})

    return {
        "total_members": total_members,
        "active_members": active_members,
        "pending_fees": pending_fees,
        "today_attendance": today_attendance,
        "revenue_by_month": revenue_by_month,
        "customers_by_month": customers_by_month,
        "pending_clients": pending_clients
    }

@app.post("/api/attendance", response_model=schemas.Attendance)
def mark_attendance(attendance: schemas.AttendanceCreate, db: Session = Depends(get_db)):
    existing = db.query(models.Attendance).filter(
        models.Attendance.member_id == attendance.member_id,
        models.Attendance.date == attendance.date
    ).first()
    
    if existing:
        existing.status = attendance.status
        db.commit()
        db.refresh(existing)
        return existing
        
    db_attendance = models.Attendance(**attendance.model_dump())
    db.add(db_attendance)
    db.commit()
    db.refresh(db_attendance)
    return db_attendance

@app.put("/api/members/{member_id}", response_model=schemas.Member)
def update_member(member_id: int, member: schemas.MemberCreate, db: Session = Depends(get_db)):
    db_member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if not db_member:
        raise HTTPException(status_code=404, detail="Member not found")
    
    db_member.name = member.name
    db_member.phone = member.phone
    db_member.join_date = member.join_date
    db_member.active = member.active
    db.commit()
    db.refresh(db_member)
    return db_member

@app.delete("/api/members/{member_id}")
def delete_member(member_id: int, db: Session = Depends(get_db)):
    db_member = db.query(models.Member).filter(models.Member.id == member_id).first()
    if db_member:
        db.query(models.Subscription).filter(models.Subscription.member_id == member_id).delete()
        db.query(models.Attendance).filter(models.Attendance.member_id == member_id).delete()
        db.delete(db_member)
        db.commit()
    return {"status": "deleted"}

@app.put("/api/subscriptions/{subscription_id}", response_model=schemas.Subscription)
def update_subscription(subscription_id: int, subscription: schemas.SubscriptionCreate, db: Session = Depends(get_db)):
    db_sub = db.query(models.Subscription).filter(models.Subscription.id == subscription_id).first()
    if not db_sub:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    db_sub.start_date = subscription.start_date
    db_sub.end_date = subscription.end_date
    db_sub.months = subscription.months
    db_sub.total_fee = subscription.total_fee
    db_sub.discount = subscription.discount
    db_sub.paid_amount = subscription.paid_amount
    db.commit()
    db.refresh(db_sub)
    return db_sub
