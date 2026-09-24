from sqlalchemy import Column, Integer, String, Float, Boolean, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from database import Base
import datetime

class Member(Base):
    __tablename__ = "members"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, index=True)
    join_date = Column(Date, default=datetime.date.today)
    active = Column(Boolean, default=True)

    subscriptions = relationship("Subscription", back_populates="member")
    attendances = relationship("Attendance", back_populates="member")

class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"))
    start_date = Column(Date)
    end_date = Column(Date)
    months = Column(Integer)
    total_fee = Column(Float)
    discount = Column(Float, default=0.0)
    paid_amount = Column(Float, default=0.0)
    
    member = relationship("Member", back_populates="subscriptions")

class Attendance(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    member_id = Column(Integer, ForeignKey("members.id"))
    date = Column(Date, default=datetime.date.today)
    status = Column(String) # "present" or "absent"

    member = relationship("Member", back_populates="attendances")
