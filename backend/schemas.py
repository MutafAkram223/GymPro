from pydantic import BaseModel
from datetime import date
from typing import List, Optional

class AttendanceBase(BaseModel):
    date: date
    status: str

class AttendanceCreate(AttendanceBase):
    member_id: int

class Attendance(AttendanceBase):
    id: int
    member_id: int
    class Config:
        from_attributes = True

class SubscriptionBase(BaseModel):
    start_date: date
    end_date: date
    months: int
    total_fee: float
    discount: float = 0.0
    paid_amount: float = 0.0

class SubscriptionCreate(SubscriptionBase):
    pass

class Subscription(SubscriptionBase):
    id: int
    member_id: int
    class Config:
        from_attributes = True

class MemberBase(BaseModel):
    name: str
    phone: str
    active: bool = True

class MemberCreate(MemberBase):
    join_date: date

class Member(MemberBase):
    id: int
    join_date: date
    subscriptions: List[Subscription] = []
    attendances: List[Attendance] = []
    class Config:
        from_attributes = True
