import os
import calendar
import datetime
from typing import Literal
from uuid import UUID
from fastapi import FastAPI, HTTPException, Query, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError(
        "SUPABASE_URL and SUPABASE_KEY environment variables are required. "
        "Please set them in your backend/.env file."
    )

# Initialize Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

app = FastAPI(
    title="Tiffin App Backend API",
    description="FastAPI Backend for managing customer meal attendance and billing",
    version="1.0.0"
)

# CORS Middleware (allowing all origins as requested)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Pydantic Schemas ---

class CustomerCreate(BaseModel):
    name: str = Field(..., min_length=1, description="Customer's full name")
    phone: str | None = Field(None, description="Customer's contact phone number")
    plan_type: str = Field(..., description="Subscription plan type (e.g. Lunch-only, Dinner-only, Both)")
    per_meal_rate: float = Field(..., ge=0.0, description="Cost rate per individual meal")

class AttendanceRecord(BaseModel):
    customer_id: UUID = Field(..., description="UUID of the customer")
    date: datetime.date = Field(..., description="Date of attendance in YYYY-MM-DD format")
    meal_type: Literal['Lunch', 'Dinner'] = Field(..., description="Meal type: 'Lunch' or 'Dinner'")
    status: Literal['Delivered', 'Canceled', 'Extra'] = Field(..., description="Delivery status of the meal")


# --- Endpoints ---

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    """
    Health check endpoint. Returns ok if backend is running.
    """
    return {"status": "ok"}


@app.get("/api/v1/daily-count")
def get_daily_count(date: str = Query(..., description="Target date in YYYY-MM-DD format")):
    """
    Join customers + daily_logs for the given date.
    Returns lunch count, dinner count, and customer breakdown.
    Only count rows where status is 'Delivered' or 'Extra'.
    """
    try:
        # Validate date format
        target_date = datetime.date.fromisoformat(date)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid date format. Expected YYYY-MM-DD."
        )

    try:
        # Fetch daily logs and join with customer name
        # PostgREST syntax for join: customers(name)
        response = supabase.table('daily_logs') \
            .select('meal_type, status, customers(name)') \
            .eq('date', target_date.isoformat()) \
            .execute()

        logs = response.data or []
        
        lunch_count = 0
        dinner_count = 0
        breakdown = []

        for log in logs:
            meal_type = log.get("meal_type")
            status_val = log.get("status")
            cust_name = log.get("customers", {}).get("name") if log.get("customers") else "Unknown Customer"

            # Increment count only for Delivered or Extra
            if status_val in ("Delivered", "Extra"):
                if meal_type == "Lunch":
                    lunch_count += 1
                elif meal_type == "Dinner":
                    dinner_count += 1

            breakdown.append({
                "customer_name": cust_name,
                "meal_type": meal_type,
                "status": status_val
            })

        return {
            "lunch_count": lunch_count,
            "dinner_count": dinner_count,
            "breakdown": breakdown
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.post("/api/v1/attendance", status_code=status.HTTP_201_CREATED)
def post_attendance(attendance: AttendanceRecord):
    """
    Upsert attendance record into daily_logs.
    Updates record if exists for same customer + date + meal_type, inserts if not.
    """
    try:
        # Check if customer exists first to give a helpful validation message
        cust_check = supabase.table('customers').select('id').eq('id', str(attendance.customer_id)).execute()
        if not cust_check.data:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Customer with ID {attendance.customer_id} does not exist."
            )

        # Upsert record using unique constraint conflict resolution
        response = supabase.table('daily_logs') \
            .upsert({
                "customer_id": str(attendance.customer_id),
                "date": attendance.date.isoformat(),
                "meal_type": attendance.meal_type,
                "status": attendance.status
            }, on_conflict="customer_id,date,meal_type") \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to write attendance log."
            )

        return {
            "success": True,
            "record": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.get("/api/v1/customers")
def get_customers():
    """
    Return all customers where is_active = true, sorted alphabetically by name.
    """
    try:
        response = supabase.table('customers') \
            .select('*') \
            .eq('is_active', True) \
            .order('name', ascending=True) \
            .execute()

        return response.data or []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.post("/api/v1/customers", status_code=status.HTTP_201_CREATED)
def create_customer(customer: CustomerCreate):
    """
    Insert a new customer into the customers table and return the created object.
    """
    try:
        response = supabase.table('customers') \
            .insert({
                "name": customer.name,
                "phone": customer.phone,
                "plan_type": customer.plan_type,
                "per_meal_rate": customer.per_meal_rate,
                "is_active": True
            }) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create customer record."
            )

        return response.data[0]

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.get("/api/v1/billing/calculate")
def calculate_billing(
    month: int = Query(..., ge=1, le=12, description="Month number (1-12)"),
    year: int = Query(..., ge=2000, description="Billing Year")
):
    """
    Calculate and upsert monthly billing:
    - Counts Delivered + Extra meals in daily_logs for that month and active customer
    - Respects customer plan_type (Lunch-only plans only count Lunch meals, Dinner-only only counts Dinner)
    - Preserves existing bill status (e.g. 'Paid') if present, otherwise defaults to 'Unpaid'
    - Upserts into monthly_bills and returns list of billed active customers
    """
    try:
        # Find start and end date of the target month
        _, last_day = calendar.monthrange(year, month)
        start_date = f"{year:04d}-{month:02d}-01"
        end_date = f"{year:04d}-{month:02d}-{last_day:02d}"

        # 1. Fetch active customers
        customers_resp = supabase.table('customers') \
            .select('*') \
            .eq('is_active', True) \
            .execute()

        active_customers = customers_resp.data or []
        if not active_customers:
            return []

        # 2. Fetch daily logs for the date range with status Delivered or Extra
        logs_resp = supabase.table('daily_logs') \
            .select('*') \
            .gte('date', start_date) \
            .lte('date', end_date) \
            .in_('status', ['Delivered', 'Extra']) \
            .execute()

        logs = logs_resp.data or []

        # Group logs by customer_id for fast lookup
        logs_by_customer = {}
        for log in logs:
            cust_id = log['customer_id']
            if cust_id not in logs_by_customer:
                logs_by_customer[cust_id] = []
            logs_by_customer[cust_id].append(log)

        # 3. Fetch existing monthly bills for the month & year to preserve status
        existing_resp = supabase.table('monthly_bills') \
            .select('customer_id, status') \
            .eq('month', month) \
            .eq('year', year) \
            .execute()

        existing_status_map = {item['customer_id']: item['status'] for item in (existing_resp.data or [])}

        # 4. Perform calculations and compile upsert data
        upsert_data = []
        result_map = {}

        for cust in active_customers:
            cust_id = cust['id']
            cust_name = cust['name']
            cust_phone = cust['phone']
            plan_type_lower = cust.get('plan_type', '').lower()
            per_meal_rate = float(cust.get('per_meal_rate', 0.0))

            cust_logs = logs_by_customer.get(cust_id, [])

            # Filter meals based on subscription plan
            if 'lunch-only' in plan_type_lower or plan_type_lower == 'lunch':
                billable_meals = [log for log in cust_logs if log['meal_type'] == 'Lunch']
            elif 'dinner-only' in plan_type_lower or plan_type_lower == 'dinner':
                billable_meals = [log for log in cust_logs if log['meal_type'] == 'Dinner']
            else:
                # E.g. 'Both' or other standard plans count all logs
                billable_meals = cust_logs

            meal_count = len(billable_meals)
            total_amount = meal_count * per_meal_rate

            # Preserve status if already calculated/paid, otherwise default to Unpaid
            bill_status = existing_status_map.get(cust_id, "Unpaid")

            upsert_data.append({
                "customer_id": cust_id,
                "month": month,
                "year": year,
                "total_amount": total_amount,
                "status": bill_status
            })

            result_map[cust_id] = {
                "customer_id": cust_id,
                "name": cust_name,
                "phone": cust_phone,
                "total_amount": total_amount,
                "status": bill_status
            }

        # 5. Upsert calculations into monthly_bills
        if upsert_data:
            supabase.table('monthly_bills') \
                .upsert(upsert_data, on_conflict="customer_id,month,year") \
                .execute()

        # Return list of bill summaries as requested
        return list(result_map.values())

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error calculating monthly bills: {str(e)}"
        )


@app.patch("/api/v1/billing/{customer_id}/mark-paid")
def mark_paid(
    customer_id: UUID,
    month: int = Query(..., ge=1, le=12, description="Month number (1-12)"),
    year: int = Query(..., ge=2000, description="Billing Year")
):
    """
    Update monthly_bills status to 'Paid' for the matching customer_id, month, and year.
    Raises 404 if no monthly bill is found.
    """
    try:
        response = supabase.table('monthly_bills') \
            .update({"status": "Paid"}) \
            .eq('customer_id', str(customer_id)) \
            .eq('month', month) \
            .eq('year', year) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Monthly bill not found for the specified customer, month, and year."
            )

        return {
            "success": True,
            "record": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@app.patch("/api/v1/customers/{customer_id}/deactivate")
def deactivate_customer(customer_id: UUID):
    """
    Update customer status to inactive (is_active = False) in the customers table.
    Raises 404 if the customer is not found.
    """
    try:
        response = supabase.table('customers') \
            .update({"is_active": False}) \
            .eq('id', str(customer_id)) \
            .execute()

        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Customer not found."
            )

        return {
            "success": True,
            "record": response.data[0]
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

