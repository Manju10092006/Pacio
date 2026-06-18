"""CareerOS Campus Intelligence — FastAPI backend.

Single-file API for the 7 must-have features + central admin panel + auth.
Auth: Emergent-managed Google OAuth (see /app/auth_testing.md).
Notifications: SendGrid + Telegram fan-out (notification_service.py).
"""
from __future__ import annotations

import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Literal

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request, Response, Cookie, Header, UploadFile, File, Form, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, EmailStr, Field

from seed_data import seed_payload, KMIT_PLACEMENT_RECORDS, YEAR_AGGREGATES, DEPARTMENTS, PROGRAMS
from notification_service import notify

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")
logging.basicConfig(level=logging.INFO)
log = logging.getLogger("careeros")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
EMERGENT_AUTH_URL = os.environ.get("EMERGENT_AUTH_URL", "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@careeros.app")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="CareerOS Campus Intelligence")

# CORS — must allow credentials (cookies for auth)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------- Models ----------------
class User(BaseModel):
    user_id: str
    email: EmailStr
    name: str
    picture: Optional[str] = None
    role: Literal["super_admin", "tpo", "hod", "coordinator"] = "tpo"
    college_id: Optional[str] = None
    approved: bool = False
    department: Optional[str] = None
    created_at: str


class SignupRequest(BaseModel):
    college_name: str
    short_name: Optional[str] = None
    role: Literal["tpo", "hod", "coordinator"] = "tpo"
    affiliated_university: Optional[str] = None
    departments: list[str] = []
    partnership_type: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None


# ---------------- Auth helpers ----------------
async def get_session_user(request: Request) -> User:
    token = request.cookies.get("session_token")
    if not token:
        auth = request.headers.get("authorization", "")
        if auth.lower().startswith("bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    sess = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not sess:
        raise HTTPException(status_code=401, detail="Invalid session")
    expires_at = sess["expires_at"]
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")
    user_doc = await db.users.find_one({"user_id": sess["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")
    return User(**user_doc)


def require_role(*roles: str):
    async def _dep(user: User = Depends(get_session_user)) -> User:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail=f"Requires role: {','.join(roles)}")
        if user.role != "super_admin" and not user.approved:
            raise HTTPException(status_code=403, detail="Account pending approval")
        return user
    return _dep


# ---------------- Startup: ensure seed ----------------
@app.on_event("startup")
async def _startup():
    # Bootstrap super admin
    existing_admin = await db.users.find_one({"email": ADMIN_EMAIL}, {"_id": 0})
    if not existing_admin:
        await db.users.insert_one({
            "user_id": f"user_{uuid.uuid4().hex[:12]}",
            "email": ADMIN_EMAIL,
            "name": "CareerOS Super Admin",
            "picture": None,
            "role": "super_admin",
            "college_id": None,
            "approved": True,
            "department": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("Seeded super admin: %s", ADMIN_EMAIL)

    # Seed KMIT data if colleges collection is empty
    n_colleges = await db.colleges.count_documents({})
    if n_colleges == 0:
        payload = seed_payload()
        await db.colleges.insert_one(payload["college"])
        await db.placement_records.insert_many(payload["placement_records"])
        await db.year_summaries.insert_many(payload["year_summaries"])
        await db.students.insert_many(payload["students"])
        await db.cohorts.insert_many(payload["cohorts"])
        await db.enrollments.insert_many(payload["enrollments"])
        await db.mous.insert_one(payload["mou"])
        await db.comm_log.insert_many(payload["comm_log"])

        # Seed a demo TPO user linked to KMIT (approved)
        tpo_user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": tpo_user_id,
            "email": "tpo@kmit.in",
            "name": "Dr. Neil Gogte",
            "picture": None,
            "role": "tpo",
            "college_id": payload["college"]["college_id"],
            "approved": True,
            "department": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        # Demo HOD + Coordinator under same college
        await db.users.insert_many([
            {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": "hod.cse@kmit.in",
                "name": "Prof. Lavanya Iyer",
                "picture": None,
                "role": "hod",
                "college_id": payload["college"]["college_id"],
                "approved": True,
                "department": "CSE",
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": "coord@kmit.in",
                "name": "Ananya Reddy",
                "picture": None,
                "role": "coordinator",
                "college_id": payload["college"]["college_id"],
                "approved": True,
                "department": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
            # Pending signup demo
            {
                "user_id": f"user_{uuid.uuid4().hex[:12]}",
                "email": "tpo@vasavi.ac.in",
                "name": "Dr. Suresh Kumar",
                "picture": None,
                "role": "tpo",
                "college_id": "col_vasavi_pending",
                "approved": False,
                "department": None,
                "created_at": datetime.now(timezone.utc).isoformat(),
            },
        ])
        # Pending college
        await db.colleges.insert_one({
            "college_id": "col_vasavi_pending",
            "name": "Vasavi College of Engineering",
            "short_name": "VCE",
            "city": "Hyderabad",
            "state": "Telangana",
            "affiliated_university": "Osmania University",
            "departments": ["CSE", "ECE", "IT"],
            "partnership_types": ["CRT"],
            "approved": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        log.info("Seeded KMIT placement data + demo users")


# ---------------- Health ----------------
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "careeros-campus-intelligence"}


# ---------------- Auth ----------------
@app.post("/api/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="session_id required")

    async with httpx.AsyncClient(timeout=15) as hx:
        r = await hx.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Emergent auth failed")
        data = r.json()

    email = data["email"]
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": data.get("name", existing["name"]), "picture": data.get("picture")}},
        )
    else:
        # Auto-create as TPO pending approval; admin email becomes super_admin
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        is_admin = email == ADMIN_EMAIL
        new_user = {
            "user_id": user_id,
            "email": email,
            "name": data.get("name", email),
            "picture": data.get("picture"),
            "role": "super_admin" if is_admin else "tpo",
            "college_id": None,
            "approved": is_admin,
            "department": None,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(new_user)

    session_token = data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })

    response.set_cookie(
        key="session_token",
        value=session_token,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
        max_age=7 * 24 * 60 * 60,
    )
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    return {"user": user_doc, "session_token": session_token}


@app.get("/api/auth/me")
async def auth_me(user: User = Depends(get_session_user)):
    return user


@app.post("/api/auth/logout")
async def auth_logout(request: Request, response: Response):
    token = request.cookies.get("session_token")
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


@app.post("/api/auth/dev-login")
async def dev_login(body: dict, response: Response):
    """Test-only login: trades an email for a session token. Used by testing agent + judges' demo."""
    email = body.get("email", "").strip().lower()
    if not email:
        raise HTTPException(status_code=400, detail="email required")
    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="user not found")
    session_token = f"dev_{uuid.uuid4().hex}"
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "user_id": user["user_id"],
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=True, samesite="none", path="/", max_age=7 * 24 * 60 * 60,
    )
    return {"user": user, "session_token": session_token}


# ---------------- Signup (Feature 1: TPO signup + admin approval) ----------------
@app.post("/api/signup")
async def signup(payload: SignupRequest, user: User = Depends(get_session_user)):
    """A logged-in user (just OAuth'd) requests TPO onboarding for a college."""
    if user.approved and user.college_id:
        return {"status": "already-onboarded", "user_id": user.user_id}

    short = payload.short_name or "".join(w[0] for w in payload.college_name.split()).upper()[:6]
    college_id = f"col_{uuid.uuid4().hex[:10]}"
    college_doc = {
        "college_id": college_id,
        "name": payload.college_name,
        "short_name": short,
        "city": None,
        "state": None,
        "affiliated_university": payload.affiliated_university,
        "departments": payload.departments or DEPARTMENTS,
        "partnership_types": [payload.partnership_type] if payload.partnership_type else ["CRT"],
        "approved": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.colleges.insert_one(college_doc)
    await db.users.update_one(
        {"user_id": user.user_id},
        {"$set": {
            "role": payload.role,
            "college_id": college_id,
            "department": payload.department,
            "approved": False,
        }},
    )
    await notify(
        db,
        event="signup_requested",
        to_email=ADMIN_EMAIL,
        subject=f"New TPO signup awaiting approval — {payload.college_name}",
        title="New partner signup",
        body_html=f"<p>{user.name} ({user.email}) has requested to onboard <b>{payload.college_name}</b> as a Skill Tank partner.</p><p>Review and approve from the Admin Panel.</p>",
        telegram_text=f"🆕 <b>TPO signup</b> · {payload.college_name} · {user.email}",
    )
    return {"status": "pending_approval", "college_id": college_id}


# ---------------- Feature 2: College profile ----------------
@app.get("/api/college/{college_id}")
async def get_college(college_id: str, user: User = Depends(get_session_user)):
    if user.role != "super_admin" and user.college_id != college_id:
        raise HTTPException(status_code=403, detail="Cross-college access denied")
    doc = await db.colleges.find_one({"college_id": college_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="not found")
    return doc


@app.patch("/api/college/{college_id}")
async def update_college(college_id: str, body: dict, user: User = Depends(get_session_user)):
    if user.role not in ("super_admin", "tpo") or (user.role != "super_admin" and user.college_id != college_id):
        raise HTTPException(status_code=403, detail="forbidden")
    allowed = {"name", "short_name", "city", "state", "affiliated_university", "departments", "partnership_types", "tpo_name", "website"}
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        return {"updated": 0}
    res = await db.colleges.update_one({"college_id": college_id}, {"$set": update})
    return {"updated": res.modified_count}


# ---------------- Feature 3: Student roster ----------------
@app.get("/api/students")
async def list_students(
    college_id: Optional[str] = None,
    department: Optional[str] = None,
    placed: Optional[bool] = None,
    q: Optional[str] = None,
    limit: int = 200,
    user: User = Depends(get_session_user),
):
    cid = college_id or user.college_id
    if user.role != "super_admin" and cid != user.college_id:
        raise HTTPException(status_code=403, detail="forbidden")
    query: dict = {"college_id": cid}
    if department:
        query["department"] = department
    if placed is not None:
        query["placement.placed"] = placed
    if q:
        query["$or"] = [
            {"name": {"$regex": q, "$options": "i"}},
            {"roll_number": {"$regex": q, "$options": "i"}},
        ]
    cursor = db.students.find(query, {"_id": 0}).limit(limit)
    items = await cursor.to_list(length=limit)
    return {"items": items, "count": len(items)}


@app.post("/api/students")
async def add_student(body: dict, user: User = Depends(get_session_user)):
    if user.role not in ("super_admin", "tpo", "hod", "coordinator"):
        raise HTTPException(status_code=403, detail="forbidden")
    body["student_id"] = body.get("student_id") or f"stu_{uuid.uuid4().hex[:10]}"
    body["college_id"] = user.college_id if user.role != "super_admin" else body.get("college_id")
    body.setdefault("placement", {"placed": False})
    body.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    await db.students.insert_one(body)
    return {"student_id": body["student_id"]}


@app.get("/api/students/{student_id}")
async def get_student(student_id: str, user: User = Depends(get_session_user)):
    s = await db.students.find_one({"student_id": student_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "not found")
    if user.role != "super_admin" and s["college_id"] != user.college_id:
        raise HTTPException(403, "forbidden")
    enrolls = await db.enrollments.find({"student_id": student_id}, {"_id": 0}).to_list(20)
    return {"student": s, "enrollments": enrolls}


# ---------------- Feature 4: Program / cohort tracking ----------------
@app.get("/api/cohorts")
async def list_cohorts(user: User = Depends(get_session_user)):
    cid = user.college_id
    if user.role == "super_admin":
        cohorts = await db.cohorts.find({}, {"_id": 0}).to_list(200)
    else:
        cohorts = await db.cohorts.find({"college_id": cid}, {"_id": 0}).to_list(200)
    return {"items": cohorts, "programs": PROGRAMS}


# ---------------- Feature 5: Placement outcomes dashboard ----------------
@app.get("/api/placements/overview")
async def placements_overview(user: User = Depends(get_session_user)):
    cid = user.college_id or "col_kmit_main"
    if user.role == "super_admin":
        cid = "col_kmit_main"
    years = await db.year_summaries.find({"college_id": cid}, {"_id": 0}).sort("academic_year", -1).to_list(20)
    records = await db.placement_records.find({"college_id": cid}, {"_id": 0}).to_list(500)
    students_placed = await db.students.count_documents({"college_id": cid, "placement.placed": True})
    students_total = await db.students.count_documents({"college_id": cid})

    # Top recruiters all-time
    pipeline = [
        {"$match": {"college_id": cid}},
        {"$group": {"_id": "$company", "selects": {"$sum": "$selects"}, "max_ctc": {"$max": "$ctc_lpa"}}},
        {"$sort": {"selects": -1}},
        {"$limit": 12},
    ]
    top_recruiters = await db.placement_records.aggregate(pipeline).to_list(20)
    top_recruiters = [{"company": r["_id"], "selects": r["selects"], "max_ctc": r["max_ctc"]} for r in top_recruiters]

    # By department breakdown for current year
    dept_breakdown = []
    for d in DEPARTMENTS:
        placed = await db.students.count_documents({"college_id": cid, "department": d, "placement.placed": True})
        total = await db.students.count_documents({"college_id": cid, "department": d})
        dept_breakdown.append({"department": d, "placed": placed, "total": total})

    return {
        "year_summaries": years,
        "records": records,
        "top_recruiters": top_recruiters,
        "department_breakdown": dept_breakdown,
        "students_placed": students_placed,
        "students_total": students_total,
    }


# ---------------- Feature 6: Training completion ----------------
@app.get("/api/training/completion")
async def training_completion(user: User = Depends(get_session_user)):
    cid = user.college_id or "col_kmit_main"
    if user.role == "super_admin":
        cid = "col_kmit_main"
    pipeline = [
        {"$match": {"college_id": cid}},
        {"$group": {
            "_id": "$program_code",
            "avg_completion": {"$avg": "$completion_pct"},
            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
            "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}},
            "enrolled": {"$sum": 1},
        }},
    ]
    by_program = await db.enrollments.aggregate(pipeline).to_list(20)
    # Join with program metadata
    prog_map = {p["code"]: p for p in PROGRAMS}
    for row in by_program:
        meta = prog_map.get(row["_id"], {})
        row["program_code"] = row["_id"]
        row["program_name"] = meta.get("name", row["_id"])
        row["modules"] = meta.get("modules")
        row["avg_completion"] = round(row["avg_completion"] or 0, 1)

    # Student-level (top 50 by completion)
    enroll_rows = await db.enrollments.find({"college_id": cid}, {"_id": 0}).sort("completion_pct", -1).limit(80).to_list(80)
    student_ids = list({e["student_id"] for e in enroll_rows})
    students = await db.students.find({"student_id": {"$in": student_ids}}, {"_id": 0}).to_list(200)
    s_map = {s["student_id"]: s for s in students}
    for e in enroll_rows:
        s = s_map.get(e["student_id"], {})
        e["student_name"] = s.get("name", "—")
        e["roll_number"] = s.get("roll_number", "—")
        e["department"] = s.get("department", "—")
    return {"by_program": by_program, "rows": enroll_rows}


# ---------------- Feature 7: MOU management ----------------
@app.get("/api/mou")
async def get_mou(user: User = Depends(get_session_user)):
    cid = user.college_id or "col_kmit_main"
    if user.role == "super_admin":
        cid = "col_kmit_main"
    mou = await db.mous.find_one({"college_id": cid}, {"_id": 0})
    if not mou:
        raise HTTPException(404, "no MOU on file")
    # Compute days until renewal
    exp = datetime.fromisoformat(mou["expires_on"])
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    days_left = (exp - datetime.now(timezone.utc)).days
    mou["days_until_renewal"] = days_left
    return mou


@app.post("/api/mou/upload")
async def upload_mou(
    file: UploadFile = File(...),
    expires_on: str = Form(...),
    partnership_type: str = Form("CRT"),
    user: User = Depends(get_session_user),
):
    if user.role not in ("super_admin", "tpo"):
        raise HTTPException(403, "forbidden")
    cid = user.college_id
    content = await file.read()
    size_kb = round(len(content) / 1024, 1)

    update = {
        "college_id": cid,
        "document_name": file.filename,
        "document_size_kb": size_kb,
        "partnership_type": partnership_type,
        "expires_on": expires_on,
        "signed_on": datetime.now(timezone.utc).isoformat(),
        "status": "active",
    }
    await db.mous.update_one({"college_id": cid}, {"$set": update}, upsert=True)
    await notify(
        db,
        event="mou_uploaded",
        to_email=ADMIN_EMAIL,
        subject=f"MOU uploaded — {cid}",
        title="MOU document received",
        body_html=f"<p>New MOU file <b>{file.filename}</b> ({size_kb} KB) uploaded.</p>",
        telegram_text=f"📄 MOU uploaded · {cid} · {file.filename}",
    )
    return {"ok": True, "document_name": file.filename, "size_kb": size_kb}


# ---------------- Central admin panel ----------------
@app.get("/api/admin/pending-signups")
async def pending_signups(user: User = Depends(require_role("super_admin"))):
    pending = await db.users.find({"approved": False}, {"_id": 0}).to_list(200)
    # Hydrate with college info
    college_ids = list({u["college_id"] for u in pending if u.get("college_id")})
    colleges = await db.colleges.find({"college_id": {"$in": college_ids}}, {"_id": 0}).to_list(200)
    c_map = {c["college_id"]: c for c in colleges}
    for u in pending:
        u["college"] = c_map.get(u.get("college_id"))
    return {"items": pending, "count": len(pending)}


@app.post("/api/admin/approve/{user_id}")
async def approve_user(user_id: str, admin: User = Depends(require_role("super_admin"))):
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "not found")
    await db.users.update_one({"user_id": user_id}, {"$set": {"approved": True}})
    if target.get("college_id"):
        await db.colleges.update_one(
            {"college_id": target["college_id"]},
            {"$set": {"approved": True, "approved_at": datetime.now(timezone.utc).isoformat()}},
        )
    await notify(
        db,
        event="account_approved",
        to_email=target["email"],
        subject="Your CareerOS access is live",
        title="Welcome aboard",
        body_html=f"<p>Hi {target['name']},</p><p>Your CareerOS Campus Intelligence access is now active. Sign in to view your placement command center.</p>",
        telegram_text=f"✅ Approved · {target['email']}",
    )
    return {"ok": True}


@app.post("/api/admin/reject/{user_id}")
async def reject_user(user_id: str, admin: User = Depends(require_role("super_admin"))):
    target = await db.users.find_one({"user_id": user_id}, {"_id": 0})
    if not target:
        raise HTTPException(404, "not found")
    await db.users.delete_one({"user_id": user_id})
    if target.get("college_id"):
        await db.colleges.delete_one({"college_id": target["college_id"], "approved": False})
    return {"ok": True}


@app.get("/api/admin/colleges")
async def admin_colleges(admin: User = Depends(require_role("super_admin"))):
    items = await db.colleges.find({}, {"_id": 0}).to_list(500)
    return {"items": items, "count": len(items)}


@app.get("/api/admin/notifications")
async def admin_notifications(admin: User = Depends(require_role("super_admin"))):
    items = await db.notification_log.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return {"items": items}


# ---------------- Public landing stats (no auth) ----------------
@app.get("/api/public/landing-stats")
async def landing_stats():
    years = await db.year_summaries.find({}, {"_id": 0}).sort("academic_year", -1).to_list(20)
    pipeline = [
        {"$group": {"_id": "$company", "selects": {"$sum": "$selects"}, "max_ctc": {"$max": "$ctc_lpa"}}},
        {"$sort": {"selects": -1}},
        {"$limit": 20},
    ]
    top = await db.placement_records.aggregate(pipeline).to_list(30)
    top = [{"company": r["_id"], "selects": r["selects"], "max_ctc": r["max_ctc"]} for r in top]
    return {"years": years, "top_recruiters": top}


# ---------------- Trigger demo notification ----------------
@app.post("/api/admin/test-notification")
async def test_notification(admin: User = Depends(require_role("super_admin"))):
    await notify(
        db,
        event="admin_test",
        to_email=ADMIN_EMAIL,
        subject="CareerOS · Test notification",
        title="Heartbeat",
        body_html="<p>This is a test notification fan-out from the admin panel.</p>",
        telegram_text="🔔 CareerOS admin test notification",
    )
    return {"ok": True}
