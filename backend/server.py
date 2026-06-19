"""CareerOS Campus Intelligence — v2 backend.

Multi-role, multi-institution platform with 13 modules.
Auth: bcrypt password login + Emergent Google OAuth + cookie session token.
RBAC: super_admin, institution_admin, tpo, faculty, student, recruiter.
"""
from __future__ import annotations

import os
import io
import uuid
import logging
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional, Literal, Any

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

import httpx
from fastapi import FastAPI, HTTPException, Request, Response, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorGridFSBucket
from pydantic import BaseModel, EmailStr

from seed_data import (
    seed_payload, STRIVER_TOPICS, DSA_TOTAL, APTITUDE_SECTIONS, INSTITUTIONS,
    PROGRAMS, KMIT_PLACEMENT_RECORDS, YEAR_AGGREGATES, build_dsa_question_bank,
)
from notification_service import notify
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token,
    get_session_user,
    require_roles,
    require_same_institution,
)
from reports import (
    placement_report_pdf, training_report_pdf, department_report_pdf,
    students_csv, applications_csv, placements_csv, build_ics,
)
from ai_service import ai_interview_feedback, ai_ats_score
from intelligence_engine import READINESS_WEIGHTS, build_readiness_roster, build_student_readiness
from ws_manager import manager as ws_manager
from fastapi import WebSocket, WebSocketDisconnect
from memory_db import MemoryDB, MemoryGridFS

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("careeros")
ROOT = Path(__file__).parent

MONGO_URL = os.environ.get("MONGO_URL")
DB_NAME = os.environ.get("DB_NAME", "careeros")
EMERGENT_AUTH_URL = os.environ.get("EMERGENT_AUTH_URL", "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data")
ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "admin@careeros.app")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "careeros2026")
DEFAULT_DEMO_PASSWORD = os.environ.get("DEFAULT_DEMO_PASSWORD", "careeros2026")

if MONGO_URL:
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]
    gridfs = AsyncIOMotorGridFSBucket(db, bucket_name="mou_files")
else:
    log.warning("MONGO_URL not configured; using in-memory demo database")
    client = None
    db = MemoryDB()
    gridfs = MemoryGridFS()

app = FastAPI(title="CareerOS")
FRONTEND_BUILD = ROOT.parent / "frontend" / "build"
SPA_HEADERS = {"Cache-Control": "no-store, max-age=0"}
DSA_TOPIC_BY_CODE = {topic["code"]: topic for topic in STRIVER_TOPICS}
DSA_TOPIC_CODES = list(DSA_TOPIC_BY_CODE.keys())
if FRONTEND_BUILD.exists():
    app.mount("/static", StaticFiles(directory=FRONTEND_BUILD / "static"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r".*",
    allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)


@app.middleware("http")
async def production_headers(request: Request, call_next):
    started = time.perf_counter()
    response = await call_next(request)
    response.headers.setdefault("X-Content-Type-Options", "nosniff")
    response.headers.setdefault("X-Frame-Options", "DENY")
    response.headers.setdefault("Referrer-Policy", "strict-origin-when-cross-origin")
    response.headers.setdefault("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
    response.headers.setdefault("X-CareerOS-Release", "v3")
    response.headers.setdefault("X-Response-Time-Ms", str(round((time.perf_counter() - started) * 1000, 2)))
    return response

# ============== MODELS ==============
class LoginBody(BaseModel):
    email: EmailStr
    password: str


class SignupBody(BaseModel):
    college_name: str
    short_name: Optional[str] = None
    role: Literal["tpo", "hod", "coordinator"] = "tpo"
    affiliated_university: Optional[str] = None
    partnership_type: Optional[str] = None
    department: Optional[str] = None


# ============== SESSION ==============
def _cookie_secure(request: Request) -> bool:
    forced = os.environ.get("COOKIE_SECURE")
    if forced is not None:
        return forced.lower() in {"1", "true", "yes", "on"}
    forwarded_proto = request.headers.get("x-forwarded-proto", "").split(",", 1)[0].strip().lower()
    return forwarded_proto == "https" or request.url.scheme == "https"


async def _create_session(user_id: str, response: Response, request: Request, token: Optional[str] = None) -> str:
    user = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    if not user:
        raise HTTPException(401, "User not found")
    session_token, jwt_id, expires_at = create_access_token(user)
    await db.user_sessions.insert_one({
        "session_token": session_token,
        "external_session_token": token,
        "jwt_id": jwt_id,
        "user_id": user_id,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat(),
    })
    secure_cookie = _cookie_secure(request)
    response.set_cookie(
        key="session_token", value=session_token,
        httponly=True, secure=secure_cookie, samesite="none" if secure_cookie else "lax", path="/",
        max_age=7 * 24 * 60 * 60,
    )
    return session_token


def _new_user(*, email: str, name: str, role: str, institution_id: Optional[str], password: Optional[str], approved: bool = True, department: Optional[str] = None) -> dict:
    normalized_email = email.lower()
    return {
        "user_id": f"user_{uuid.uuid5(uuid.NAMESPACE_DNS, normalized_email).hex[:12]}",
        "email": normalized_email,
        "name": name,
        "role": role,
        "institution_id": institution_id,
        "department": department,
        "approved": approved,
        "password_hash": hash_password(password) if password else None,
        "picture": None,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


async def _audit_log(
    event: str,
    *,
    user: Optional[dict] = None,
    institution_id: Optional[str] = None,
    resource: Optional[str] = None,
    resource_id: Optional[str] = None,
    outcome: str = "success",
    metadata: Optional[dict[str, Any]] = None,
    request: Optional[Request] = None,
) -> None:
    actor = user or {}
    ip = request.client.host if request and request.client else None
    user_agent = request.headers.get("user-agent") if request else None
    await db.audit_logs.insert_one({
        "audit_id": f"audit_{uuid.uuid4().hex[:12]}",
        "event": event,
        "outcome": outcome,
        "actor_user_id": actor.get("user_id"),
        "actor_email": actor.get("email"),
        "actor_role": actor.get("role"),
        "institution_id": institution_id if institution_id is not None else actor.get("institution_id"),
        "resource": resource,
        "resource_id": resource_id,
        "metadata": metadata or {},
        "ip": ip,
        "user_agent": user_agent,
        "created_at": datetime.now(timezone.utc).isoformat(),
    })


async def _resolve_recruiter_id(user: dict) -> Optional[str]:
    if user.get("role") != "recruiter":
        return None
    if user.get("recruiter_id"):
        return user["recruiter_id"]
    email = user.get("email", "")
    domain = email.split("@", 1)[1].split(".", 1)[0] if "@" in email else ""
    candidate = f"rec_{domain.lower().replace('-', '_')}" if domain else None
    if candidate:
        recruiter = await db.recruiters.find_one({"recruiter_id": candidate}, {"_id": 0})
        if recruiter:
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"recruiter_id": candidate}})
            user["recruiter_id"] = candidate
            return candidate
    return None


# ============== STARTUP — seed + demo users ==============
# ============== ROLE WORKSPACE HELPERS ==============
def _first_name(name: Optional[str], fallback: str = "there") -> str:
    if not name:
        return fallback
    for part in name.replace("(", " ").split():
        clean = part.strip(".,)")
        if clean and clean.lower() not in {"dr", "mr", "mrs", "ms", "prof"}:
            return clean
    return fallback


def _pct(part: float, total: float, digits: int = 0) -> float:
    if not total:
        return 0
    return round((part / total) * 100, digits)


def _workspace_kpi(
    label: str,
    value: Any,
    *,
    sub: str = "",
    unit: str = "",
    status: str = "neutral",
    to: Optional[str] = None,
) -> dict:
    return {"label": label, "value": value, "unit": unit, "sub": sub, "status": status, "to": to}


def _workspace_action(label: str, to: str, *, priority: str, reason: str) -> dict:
    return {"label": label, "to": to, "priority": priority, "reason": reason}


def _workspace_alert(
    title: str,
    body: str,
    *,
    severity: str = "info",
    kind: str = "decision",
    to: Optional[str] = None,
) -> dict:
    return {"title": title, "body": body, "severity": severity, "kind": kind, "to": to}


def _pipeline_counts(items: list[dict]) -> dict[str, int]:
    stages = {"Applied": 0, "Shortlisted": 0, "Assessment": 0, "Interview": 0, "Selected": 0, "Rejected": 0}
    for item in items:
        stage = item.get("stage") or "Applied"
        stages[stage] = stages.get(stage, 0) + 1
    return stages


def _score_band(score: float) -> dict[str, str]:
    if score >= 85:
        return {"code": "placement_ready", "label": "Placement ready"}
    if score >= 72:
        return {"code": "nearly_ready", "label": "Nearly ready"}
    if score >= 58:
        return {"code": "developing", "label": "Developing"}
    return {"code": "needs_intervention", "label": "Needs intervention"}


def _component_status(score: float) -> str:
    if score >= 80:
        return "strong"
    if score >= 65:
        return "on_track"
    if score >= 50:
        return "watch"
    return "critical"


def _clamp_score(value: float) -> float:
    return max(0, min(100, float(value or 0)))


def _slug(value: str) -> str:
    return "".join(ch.lower() if ch.isalnum() else "_" for ch in value).strip("_")


def _difficulty_for_index(index: int) -> str:
    if index <= 2:
        return "Easy"
    if index <= 4:
        return "Medium"
    return "Hard"


def _build_aptitude_question_bank(now: Optional[str] = None) -> list[dict]:
    ts = now or datetime.now(timezone.utc).isoformat()
    questions = []
    global_order = 1
    for section in APTITUDE_SECTIONS:
        for topic_index, topic in enumerate(section["topics"], start=1):
            topic_slug = _slug(topic)
            for index in range(1, 7):
                difficulty = _difficulty_for_index(index)
                questions.append({
                    "question_id": f"apt_{section['code'].lower()}_{topic_slug}_{index:02d}",
                    "section": section["name"],
                    "section_code": section["code"],
                    "topic": topic,
                    "topic_code": topic_slug.upper(),
                    "difficulty": difficulty,
                    "title": f"{topic} drill {index}",
                    "prompt": f"{topic} placement aptitude drill {index}",
                    "order": index,
                    "topic_order": topic_index,
                    "global_order": global_order,
                    "expected_time_sec": 45 if difficulty == "Easy" else 75 if difficulty == "Medium" else 105,
                    "created_at": ts,
                    "active": True,
                })
                global_order += 1
    return questions


async def _ensure_aptitude_catalog() -> None:
    if await db.aptitude_questions.count_documents({}) == 0:
        await db.aptitude_questions.insert_many(_build_aptitude_question_bank())


async def _ensure_student_aptitude_progress(student: dict) -> None:
    await _ensure_aptitude_catalog()
    existing = await db.aptitude_question_progress.count_documents({"student_id": student["student_id"]})
    if existing:
        return
    now = datetime.now(timezone.utc).isoformat()
    scores = await db.aptitude_scores.find({"student_id": student["student_id"]}, {"_id": 0}).to_list(100)
    score_by_section = {row["section_code"]: row for row in scores}
    questions = await db.aptitude_questions.find({}, {"_id": 0}).sort("global_order", 1).to_list(1000)
    inserts = []
    for section in APTITUDE_SECTIONS:
        section_questions = [q for q in questions if q["section_code"] == section["code"]]
        score = score_by_section.get(section["code"], {})
        score_pct = float(score.get("score_pct", 0) or 0)
        accuracy_pct = float(score.get("accuracy_pct", score_pct) or 0)
        avg_time = float(score.get("avg_time_sec", 90) or 90)
        attempted_count = int(round(len(section_questions) * min(1, max(0.35, (score.get("tests_taken", 2) or 2) / 18))))
        solved_count = int(round(len(section_questions) * min(1, max(0, score_pct / 100))))
        attempted_count = max(solved_count, min(len(section_questions), attempted_count))
        for index, question in enumerate(section_questions[:attempted_count], start=1):
            solved = index <= solved_count
            expected = float(question.get("expected_time_sec", 75) or 75)
            speed = _clamp_score(100 - max(0, avg_time - expected) * 0.9)
            mastery = round(_clamp_score((score_pct * 0.48) + (accuracy_pct * 0.32) + (speed * 0.20) + (8 if solved else -8)), 1)
            last_attempted = score.get("attempted_at") or now
            inserts.append({
                "progress_id": f"aptp_{uuid.uuid4().hex[:10]}",
                "student_id": student["student_id"],
                "institution_id": student["institution_id"],
                "question_id": question["question_id"],
                "topic": question["topic"],
                "topic_code": question["topic_code"],
                "section": question["section"],
                "section_code": question["section_code"],
                "difficulty": question["difficulty"],
                "solved": solved,
                "attempted": True,
                "accuracy": round(accuracy_pct, 1),
                "speed": round(speed, 1),
                "average_time": round(avg_time, 1),
                "mastery_score": mastery,
                "revision_due": mastery < 72,
                "last_attempted": last_attempted,
                "updated_at": now,
            })
    if inserts:
        await db.aptitude_question_progress.insert_many(inserts)


async def _ensure_aptitude_progress_for_students(students: list[dict]) -> None:
    await _ensure_aptitude_catalog()
    for student in students[:1200]:
        await _ensure_student_aptitude_progress(student)


async def _ensure_resume_versions_for_students(students: Optional[list[dict]] = None) -> None:
    query: dict[str, Any] = {}
    if students is not None:
        query["student_id"] = {"$in": [student["student_id"] for student in students]}
    reports = await db.ats_reports.find(query, {"_id": 0}).sort("created_at", 1).to_list(5000)
    if not reports:
        return
    existing_ids = {
        row["source_ats_id"]
        for row in await db.resume_versions.find({"source_ats_id": {"$in": [r["ats_id"] for r in reports]}}, {"_id": 0, "source_ats_id": 1}).to_list(5000)
        if row.get("source_ats_id")
    }
    counters: dict[str, int] = {}
    inserts = []
    for report in reports:
        if report["ats_id"] in existing_ids:
            continue
        sid = report["student_id"]
        counters[sid] = counters.get(sid, 0) + 1
        keyword_score = report.get("keyword_match_pct", 0) or 0
        recruiter_match = round((report.get("score", 0) * 0.48) + (keyword_score * 0.34) + (report.get("format_score", 0) * 0.18), 1)
        inserts.append({
            "resume_id": f"res_{uuid.uuid4().hex[:10]}",
            "source_ats_id": report["ats_id"],
            "student_id": sid,
            "institution_id": report["institution_id"],
            "version": counters[sid],
            "upload_date": report.get("created_at"),
            "uploaded_filename": report.get("uploaded_filename"),
            "ats_score": report.get("score", 0),
            "keyword_score": keyword_score,
            "missing_keywords": report.get("missing_keywords", []),
            "recruiter_match_score": recruiter_match,
            "format_score": report.get("format_score", 0),
            "improvement_suggestions": [
                f"Add evidence for {kw}" for kw in (report.get("missing_keywords", []) or [])[:3]
            ],
            "created_at": report.get("created_at"),
        })
    if inserts:
        await db.resume_versions.insert_many(inserts)


async def _batch_readiness_summary(
    iid: str,
    *,
    department: Optional[str] = None,
    limit: int = 1200,
) -> dict:
    """Bulk readiness summary for executive analytics without per-student query fan-out."""
    query: dict[str, Any] = {"institution_id": iid}
    if department:
        query["department"] = department
    safe_limit = max(1, min(limit, 1500))
    students = await db.students.find(query, {"_id": 0}).limit(safe_limit).to_list(safe_limit)
    sids = [student["student_id"] for student in students]
    if not sids:
        return {
            "rows": [],
            "avg_readiness": 0,
            "placement_ready": 0,
            "needs_intervention": 0,
            "by_band": {},
            "component_avgs": {key: 0 for key in READINESS_WEIGHTS},
            "weak_students": [],
            "institution_id": iid,
            "department": department,
        }

    dsa_rows = await db.dsa_progress.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(20000)
    aptitude_question_rows = await db.aptitude_question_progress.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(30000)
    aptitude_rows = await db.aptitude_scores.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(20000)
    ats_rows = await db.ats_reports.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(10000)
    resume_rows = await db.resume_versions.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(10000)
    interview_rows = await db.interview_reports.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(10000)
    application_rows = await db.applications.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(20000)

    dsa_by_student: dict[str, dict[str, float]] = {}
    for row in dsa_rows:
        bucket = dsa_by_student.setdefault(row["student_id"], {"solved": 0, "total": 0})
        bucket["solved"] += row.get("solved", 0) or 0
        bucket["total"] += row.get("total", 0) or 0

    aptitude_by_student: dict[str, list[dict]] = {}
    for row in aptitude_rows:
        aptitude_by_student.setdefault(row["student_id"], []).append(row)

    aptitude_questions_by_student: dict[str, list[dict]] = {}
    for row in aptitude_question_rows:
        aptitude_questions_by_student.setdefault(row["student_id"], []).append(row)

    ats_by_student: dict[str, dict] = {}
    for row in sorted(ats_rows, key=lambda item: item.get("created_at") or "", reverse=True):
        ats_by_student.setdefault(row["student_id"], row)

    resumes_by_student: dict[str, dict] = {}
    for row in sorted(resume_rows, key=lambda item: (item.get("version") or 0, item.get("upload_date") or ""), reverse=True):
        resumes_by_student.setdefault(row["student_id"], row)

    interviews_by_student: dict[str, list[dict]] = {}
    for row in interview_rows:
        interviews_by_student.setdefault(row["student_id"], []).append(row)

    applications_by_student: dict[str, list[dict]] = {}
    for row in application_rows:
        applications_by_student.setdefault(row["student_id"], []).append(row)

    rows = []
    for student in students:
        sid = student["student_id"]
        dsa = dsa_by_student.get(sid, {})
        dsa_score = (dsa.get("solved", 0) / max(1, dsa.get("total", 0))) * 100 if dsa else 0

        aptitude_questions = aptitude_questions_by_student.get(sid, [])
        aptitudes = aptitude_by_student.get(sid, [])
        if aptitude_questions:
            aptitude_score_avg = sum(row.get("mastery_score", 0) or 0 for row in aptitude_questions) / max(1, len(aptitude_questions))
            aptitude_accuracy = sum(row.get("accuracy", 0) or 0 for row in aptitude_questions) / max(1, len(aptitude_questions))
            speed_score = sum(row.get("speed", 0) or 0 for row in aptitude_questions) / max(1, len(aptitude_questions))
            solved = sum(1 for row in aptitude_questions if row.get("solved"))
            attempted = sum(1 for row in aptitude_questions if row.get("attempted"))
            aptitude_score = (aptitude_score_avg * 0.55) + (aptitude_accuracy * 0.25) + (speed_score * 0.15) + (min(100, solved / max(1, attempted) * 100) * 0.05)
        else:
            aptitude_score_avg = sum(row.get("score_pct", 0) or 0 for row in aptitudes) / max(1, len(aptitudes))
            aptitude_accuracy = sum(row.get("accuracy_pct", 0) or 0 for row in aptitudes) / max(1, len(aptitudes))
            aptitude_time = sum(row.get("avg_time_sec", 0) or 0 for row in aptitudes) / max(1, len(aptitudes))
            speed_score = _clamp_score(100 - max(0, aptitude_time - 45) * 1.15) if aptitudes else 0
            aptitude_score = (aptitude_score_avg * 0.65) + (aptitude_accuracy * 0.25) + (speed_score * 0.10)

        latest_resume = resumes_by_student.get(sid)
        latest_ats = ats_by_student.get(sid)
        ats_score = latest_resume.get("ats_score", 0) if latest_resume else latest_ats.get("score", 0) if latest_ats else student.get("ats_score", 0)

        interviews = interviews_by_student.get(sid, [])
        interview_scores = []
        for row in interviews:
            if row.get("overall_score") is not None:
                interview_scores.append(row.get("overall_score") or 0)
            else:
                interview_scores.append(sum([
                    row.get("confidence_score", 0) or 0,
                    row.get("communication_score", 0) or 0,
                    row.get("technical_score", 0) or 0,
                ]) / 3)
        interview_score = sum(interview_scores) / max(1, len(interview_scores))

        cgpa_score = _clamp_score(((float(student.get("cgpa") or 0) - 5.0) / 5.0) * 100)
        applications = applications_by_student.get(sid, [])
        active_pillars = sum([bool(dsa), bool(aptitude_questions or aptitudes), bool(latest_resume or latest_ats), bool(interviews), bool(applications)])
        active_applications = len([row for row in applications if row.get("stage") not in {"Rejected", "Selected"}])
        consistency_score = _clamp_score((active_pillars / 5 * 65) + (active_applications * 12) + (len(applications) * 3))

        component_scores = {
            "dsa": _clamp_score(dsa_score),
            "aptitude": _clamp_score(aptitude_score),
            "ats": _clamp_score(ats_score),
            "interview": _clamp_score(interview_score),
            "cgpa": _clamp_score(cgpa_score),
            "consistency": _clamp_score(consistency_score),
        }
        overall = round(sum(component_scores[key] * READINESS_WEIGHTS[key] for key in READINESS_WEIGHTS), 1)
        band = _score_band(overall)
        components = {
            key: {"score": round(score, 1), "weight": READINESS_WEIGHTS[key], "status": _component_status(score)}
            for key, score in component_scores.items()
        }
        rows.append({
            "student_id": sid,
            "name": student.get("name"),
            "roll_number": student.get("roll_number"),
            "department": student.get("department"),
            "cgpa": student.get("cgpa"),
            "placement": student.get("placement", {}),
            "readiness_score": overall,
            "readiness_band": band["code"],
            "readiness_label": band["label"],
            "components": components,
            "risks": [
                {"area": key, "severity": "high" if score < 45 else "medium", "score": round(score, 1)}
                for key, score in component_scores.items()
                if score < (55 if key == "cgpa" else 60)
            ][:3],
            "top_recommendations": [],
        })

    rows.sort(key=lambda row: row["readiness_score"], reverse=True)
    scores = [row["readiness_score"] for row in rows]
    by_band: dict[str, int] = {}
    for row in rows:
        by_band[row["readiness_band"]] = by_band.get(row["readiness_band"], 0) + 1
    component_avgs = {
        key: round(sum(row["components"][key]["score"] for row in rows) / max(1, len(rows)), 1)
        for key in READINESS_WEIGHTS
    }
    weak_students = sorted(rows, key=lambda row: row["readiness_score"])[:10]
    return {
        "rows": rows[:200],
        "avg_readiness": round(sum(scores) / max(1, len(scores)), 1),
        "placement_ready": sum(1 for row in rows if row["readiness_score"] >= 72),
        "needs_intervention": sum(1 for row in rows if row["readiness_score"] < 58),
        "by_band": by_band,
        "component_avgs": component_avgs,
        "weak_students": weak_students,
        "institution_id": iid,
        "department": department,
    }


async def _institution_operating_data(
    iid: str,
    *,
    department: Optional[str] = None,
    readiness_limit: int = 1000,
    fast_readiness: bool = False,
) -> dict:
    inst = await db.institutions.find_one({"institution_id": iid}, {"_id": 0}) or {}
    student_query: dict[str, Any] = {"institution_id": iid}
    if department:
        student_query["department"] = department
    students_total = await db.students.count_documents(student_query)
    students_placed = await db.students.count_documents({**student_query, "placement.placed": True})

    years = await db.year_summaries.find({"institution_id": iid}, {"_id": 0}).sort("academic_year", -1).to_list(20)
    latest = years[0] if years else {}
    top_pipe = [
        {"$match": {"institution_id": iid}},
        {"$group": {"_id": "$company", "selects": {"$sum": "$selects"}, "max_ctc": {"$max": "$ctc_lpa"}}},
        {"$sort": {"selects": -1}},
        {"$limit": 12},
    ]
    top_recruiters = await db.placement_records.aggregate(top_pipe).to_list(20)
    top_recruiters = [
        {"company": row["_id"], "selects": row["selects"], "max_ctc": row["max_ctc"]}
        for row in top_recruiters
    ]

    dept_breakdown = []
    for dept in inst.get("departments", []):
        if department and dept != department:
            continue
        placed = await db.students.count_documents({"institution_id": iid, "department": dept, "placement.placed": True})
        total = await db.students.count_documents({"institution_id": iid, "department": dept})
        dept_breakdown.append({"department": dept, "placed": placed, "total": total, "placement_rate": _pct(placed, total)})

    if fast_readiness:
        readiness = await _batch_readiness_summary(iid, department=department, limit=readiness_limit)
    else:
        readiness = await build_readiness_roster(
            db,
            institution_id=iid,
            department=department,
            limit=readiness_limit,
        )

    app_query: dict[str, Any] = {"institution_id": iid}
    if department:
        app_query["department"] = department
    applications = await db.applications.find(app_query, {"_id": 0}).sort("applied_at", -1).limit(500).to_list(500)
    pipeline = _pipeline_counts(applications)
    scheduled_interviews = await db.interview_schedule.count_documents(app_query)

    jobs = await db.jobs.find({"institutions": {"$in": [iid]}}, {"_id": 0}).sort("drive_date", -1).limit(200).to_list(200)
    open_jobs = [job for job in jobs if job.get("status") == "open"]

    enrollment_query: dict[str, Any] = {"institution_id": iid}
    if department:
        dept_students = await db.students.find(student_query, {"_id": 0, "student_id": 1}).to_list(1000)
        enrollment_query["student_id"] = {"$in": [student["student_id"] for student in dept_students]}
    enrollments = await db.enrollments.find(enrollment_query, {"_id": 0}).limit(1000).to_list(1000)
    training_avg = round(sum(row.get("completion_pct", 0) or 0 for row in enrollments) / max(1, len(enrollments)), 1)

    return {
        "institution": inst,
        "department": department,
        "year_summaries": years,
        "latest_year": latest,
        "top_recruiters": top_recruiters,
        "department_breakdown": dept_breakdown,
        "students_total": students_total,
        "students_placed": students_placed,
        "placement_rate": _pct(students_placed, students_total),
        "readiness": readiness,
        "applications": applications,
        "pipeline": pipeline,
        "jobs": jobs,
        "open_jobs": open_jobs,
        "scheduled_interviews": scheduled_interviews,
        "training_avg": training_avg,
    }


async def _recruiter_talent_pool_payload(
    recruiter_id: Optional[str],
    *,
    min_cgpa: float = 6.5,
    min_readiness: float = 0,
    department: Optional[str] = None,
    skill: Optional[str] = None,
    limit: int = 60,
) -> dict:
    if not recruiter_id:
        return {"items": [], "count": 0, "recruiter_id": None, "institution_ids": []}
    jobs = await db.jobs.find({"recruiter_id": recruiter_id}, {"_id": 0}).to_list(500)
    institution_ids = sorted({iid for job in jobs for iid in job.get("institutions", [])})
    if not institution_ids:
        return {"items": [], "count": 0, "recruiter_id": recruiter_id, "institution_ids": []}
    safe_limit = max(1, min(limit, 120))
    query: dict[str, Any] = {"institution_id": {"$in": institution_ids}, "cgpa": {"$gte": min_cgpa}}
    if department:
        query["department"] = department
    candidates = await db.students.find(
        query,
        {"_id": 0},
    ).limit(120).to_list(120)
    items = []
    skill_filter = skill.lower().strip() if skill else None
    for candidate in candidates:
        if skill_filter and skill_filter not in " ".join(candidate.get("skills", [])).lower():
            continue
        readiness = await build_student_readiness(db, candidate)
        if readiness["score"] < min_readiness:
            continue
        candidate["readiness_score"] = readiness["score"]
        candidate["readiness_band"] = readiness["band"]
        candidate["readiness_label"] = readiness["label"]
        candidate["readiness_components"] = readiness["components"]
        candidate["readiness_risks"] = readiness["risks"][:3]
        candidate["match_reasons"] = [
            f"Readiness {readiness['score']}/100",
            f"CGPA {candidate.get('cgpa')}",
            f"{candidate.get('department')} / {candidate.get('institution_id')}",
        ]
        if skill_filter:
            candidate["match_reasons"].append(f"Skill match: {skill}")
        items.append(candidate)
    items.sort(key=lambda row: row.get("readiness_score", 0), reverse=True)
    items = items[:safe_limit]
    return {
        "items": items,
        "count": len(items),
        "recruiter_id": recruiter_id,
        "institution_ids": institution_ids,
        "filters": {
            "min_cgpa": min_cgpa,
            "min_readiness": min_readiness,
            "department": department,
            "skill": skill,
            "limit": safe_limit,
        },
    }


async def _student_scope_for_user(user: dict, *, department: Optional[str] = None) -> tuple[str, Optional[str], list[dict]]:
    iid = user.get("institution_id") or "inst_kmit"
    if user.get("role") == "student" and user.get("student_id"):
        student = await db.students.find_one({"student_id": user["student_id"]}, {"_id": 0})
        return iid, student.get("department") if student else None, [student] if student else []
    scoped_department = department
    if user.get("role") == "faculty" and user.get("department"):
        scoped_department = user["department"]
    query: dict[str, Any] = {"institution_id": iid}
    if scoped_department:
        query["department"] = scoped_department
    students = await db.students.find(query, {"_id": 0}).to_list(1200)
    return iid, scoped_department, students


def _avg_num(rows: list[dict], key: str) -> float:
    vals = [float(row.get(key) or 0) for row in rows]
    return round(sum(vals) / max(1, len(vals)), 1)


def _health(score: float) -> str:
    if score >= 80:
        return "strong"
    if score >= 68:
        return "stable"
    if score >= 55:
        return "watch"
    return "critical"


def _module_action(area: str, score: float) -> str:
    if area == "aptitude":
        return "Run timed section drills for the weakest sections."
    if area == "ats":
        return "Push role-specific resume rewrites for low ATS and keyword-match rows."
    if area == "interviews":
        return "Schedule mock interview remediation for low rubric scores."
    if area == "training":
        return "Move low-completion learners into faculty follow-up cohorts."
    if area == "placements":
        return "Prioritize recruiter follow-ups and department-level readiness gaps."
    if area == "dsa":
        return "Assign question-level DSA recovery from the weakest topics."
    return "Review the underlying student queue."


# ============== DSA QUESTION HELPERS ==============
async def _resolve_student_for_user(user: dict) -> tuple[Optional[str], Optional[dict]]:
    sid = user.get("student_id")
    if not sid and user.get("institution_id"):
        student = await db.students.find_one({"institution_id": user.get("institution_id")}, {"_id": 0})
        if student:
            sid = student["student_id"]
            await db.users.update_one({"user_id": user["user_id"]}, {"$set": {"student_id": sid}})
            return sid, student
    student = await db.students.find_one({"student_id": sid}, {"_id": 0}) if sid else None
    return sid, student


async def _sync_topic_progress_from_questions(student: dict, topic_code: str) -> dict:
    topic = DSA_TOPIC_BY_CODE.get(topic_code)
    if not topic:
        raise HTTPException(404, "topic not found")
    questions = await db.dsa_questions.find({"topic_code": topic_code}, {"_id": 0}).sort("order", 1).to_list(600)
    qids = [q["question_id"] for q in questions]
    progress = await db.dsa_question_progress.find(
        {"student_id": student["student_id"], "question_id": {"$in": qids}},
        {"_id": 0},
    ).to_list(600)
    solved = sum(1 for row in progress if row.get("solved"))
    attempted = sum(1 for row in progress if row.get("attempted") or row.get("solved"))
    last_dates = [row.get("last_solved_at") for row in progress if row.get("last_solved_at")]
    row = {
        "progress_id": f"dsa_{student['student_id']}_{topic_code}".lower(),
        "student_id": student["student_id"],
        "institution_id": student["institution_id"],
        "topic_code": topic_code,
        "topic_name": topic["name"],
        "topic_order": topic["order"],
        "total": topic["problems"],
        "solved": solved,
        "attempted": attempted,
        "last_solved_at": max(last_dates) if last_dates else None,
    }
    await db.dsa_progress.update_one(
        {"student_id": student["student_id"], "topic_code": topic_code},
        {"$set": row},
        upsert=True,
    )
    return row


async def _ensure_student_dsa_catalog(student: dict) -> None:
    """Backfill question progress from legacy topic rows and sync topic aggregates."""
    if await db.dsa_questions.count_documents({}) == 0:
        await db.dsa_questions.insert_many(build_dsa_question_bank())

    existing_question_rows = await db.dsa_question_progress.count_documents({"student_id": student["student_id"]})
    if existing_question_rows == 0:
        legacy_rows = await db.dsa_progress.find({"student_id": student["student_id"]}, {"_id": 0}).to_list(100)
        legacy_by_topic = {row["topic_code"]: row for row in legacy_rows}
        inserts = []
        now = datetime.now(timezone.utc).isoformat()
        for topic in STRIVER_TOPICS:
            questions = await db.dsa_questions.find({"topic_code": topic["code"]}, {"_id": 0}).sort("order", 1).to_list(600)
            legacy = legacy_by_topic.get(topic["code"], {})
            old_total = max(1, int(legacy.get("total") or topic["problems"]))
            solved_ratio = min(1, max(0, (legacy.get("solved", 0) or 0) / old_total))
            attempted_ratio = min(1, max(solved_ratio, (legacy.get("attempted", legacy.get("solved", 0)) or 0) / old_total))
            solved = min(topic["problems"], int(round(topic["problems"] * solved_ratio)))
            attempted = min(topic["problems"], max(solved, int(round(topic["problems"] * attempted_ratio))))
            last_solved_at = legacy.get("last_solved_at") or now
            for index, question in enumerate(questions[:attempted], start=1):
                is_solved = index <= solved
                inserts.append({
                    "progress_id": f"dsqp_{uuid.uuid4().hex[:10]}",
                    "student_id": student["student_id"],
                    "institution_id": student["institution_id"],
                    "question_id": question["question_id"],
                    "topic_code": question["topic_code"],
                    "subtopic_code": question["subtopic_code"],
                    "solved": is_solved,
                    "attempted": True,
                    "mastery": 86 if is_solved else 36,
                    "revision_count": 1 if is_solved else 0,
                    "notes": "",
                    "faculty_comments": [],
                    "difficulty": question["difficulty"],
                    "last_solved_at": last_solved_at if is_solved else None,
                    "updated_at": now,
                })
        if inserts:
            await db.dsa_question_progress.insert_many(inserts)

    for topic in STRIVER_TOPICS:
        await _sync_topic_progress_from_questions(student, topic["code"])


async def _student_dsa_question_payload(student: dict) -> dict:
    await _ensure_student_dsa_catalog(student)
    questions = await db.dsa_questions.find({}, {"_id": 0}).sort("global_order", 1).to_list(DSA_TOTAL)
    progress_rows = await db.dsa_question_progress.find(
        {"student_id": student["student_id"]},
        {"_id": 0},
    ).to_list(DSA_TOTAL)
    progress_by_question = {row["question_id"]: row for row in progress_rows}
    topic_groups = []
    merged_all = []
    for topic in STRIVER_TOPICS:
        topic_questions = []
        for question in [q for q in questions if q["topic_code"] == topic["code"]]:
            progress = progress_by_question.get(question["question_id"], {})
            merged = {
                **question,
                "solved": bool(progress.get("solved")),
                "attempted": bool(progress.get("attempted") or progress.get("solved")),
                "mastery": int(progress.get("mastery", 0) or 0),
                "revision_count": int(progress.get("revision_count", 0) or 0),
                "notes": progress.get("notes", ""),
                "faculty_comments": progress.get("faculty_comments", []),
                "last_solved_at": progress.get("last_solved_at"),
                "updated_at": progress.get("updated_at"),
            }
            topic_questions.append(merged)
            merged_all.append(merged)
        subtopics = []
        for subtopic_name in sorted({q["subtopic_name"] for q in topic_questions}):
            rows = [q for q in topic_questions if q["subtopic_name"] == subtopic_name]
            subtopics.append({
                "name": subtopic_name,
                "total": len(rows),
                "solved": sum(1 for q in rows if q["solved"]),
                "attempted": sum(1 for q in rows if q["attempted"]),
            })
        attempted = sum(1 for q in topic_questions if q["attempted"])
        topic_groups.append({
            "topic_code": topic["code"],
            "topic_name": topic["name"],
            "topic_order": topic["order"],
            "total": len(topic_questions),
            "solved": sum(1 for q in topic_questions if q["solved"]),
            "attempted": attempted,
            "mastery_avg": round(sum(q["mastery"] for q in topic_questions) / max(1, attempted), 1),
            "subtopics": subtopics,
            "questions": topic_questions,
        })
    return {
        "student_id": student["student_id"],
        "total": DSA_TOTAL,
        "solved": sum(1 for q in merged_all if q["solved"]),
        "attempted": sum(1 for q in merged_all if q["attempted"]),
        "topics": topic_groups,
        "questions": merged_all,
    }


# ============== STARTUP - seed + demo users ==============
@app.on_event("startup")
async def _startup():
    await db.users.create_index("email", unique=True)
    await db.user_sessions.create_index("jwt_id", unique=True)
    await db.audit_logs.create_index("created_at")
    await db.dsa_questions.create_index("question_id", unique=True)
    await db.dsa_question_progress.create_index("student_id")
    await db.dsa_question_progress.create_index("question_id")
    await db.aptitude_questions.create_index("question_id", unique=True)
    await db.aptitude_question_progress.create_index("student_id")
    await db.aptitude_question_progress.create_index("question_id")
    await db.resume_versions.create_index("student_id")
    await db.recruiter_shortlists.create_index("recruiter_id")
    await db.recruiter_saved_filters.create_index("recruiter_id")
    n_inst = await db.institutions.count_documents({})
    if n_inst == 0:
        log.info("Seeding institutions, students, recruiters, DSA, aptitude…")
        payload = seed_payload()
        for col, items in payload.items():
            if items:
                await db[col].insert_many(items)
        log.info("Seeded %d institutions, %d students, %d jobs, %d applications, %d DSA rows",
                 len(payload["institutions"]), len(payload["students"]),
                 len(payload["jobs"]), len(payload["applications"]), len(payload["dsa_progress"]))

    if await db.dsa_questions.count_documents({}) == 0:
        await db.dsa_questions.insert_many(build_dsa_question_bank())

    await _ensure_aptitude_catalog()

    # Demo users with password — idempotent
    if await db.dsa_question_progress.count_documents({}) == 0 and await db.dsa_progress.count_documents({}) > 0:
        students_with_dsa = await db.students.find({"institution_id": "inst_kmit"}, {"_id": 0}).to_list(1000)
        for student in students_with_dsa:
            await _ensure_student_dsa_catalog(student)

    if await db.aptitude_question_progress.count_documents({}) == 0 and await db.aptitude_scores.count_documents({}) > 0:
        students_with_aptitude = await db.students.find({"institution_id": "inst_kmit"}, {"_id": 0}).to_list(1000)
        await _ensure_aptitude_progress_for_students(students_with_aptitude)

    if await db.resume_versions.count_documents({}) == 0 and await db.ats_reports.count_documents({}) > 0:
        await _ensure_resume_versions_for_students()

    demo_users = [
        {"email": ADMIN_EMAIL, "name": "Platform Super Admin", "role": "super_admin", "institution_id": None, "department": None},
        {"email": "institution@kmit.in", "name": "KMIT — Institution Admin", "role": "institution_admin", "institution_id": "inst_kmit"},
        {"email": "tpo@kmit.in", "name": "Dr. Neil Gogte", "role": "tpo", "institution_id": "inst_kmit"},
        {"email": "faculty@kmit.in", "name": "Prof. Lavanya Iyer", "role": "faculty", "institution_id": "inst_kmit", "department": "CSE"},
        {"email": "student@kmit.in", "name": "Aarav Reddy", "role": "student", "institution_id": "inst_kmit", "department": "CSE"},
        {"email": "recruiter@amazon.com", "name": "Priya Sharma (Amazon)", "role": "recruiter", "institution_id": None, "department": None},
        # Legacy / approval-flow demo
        {"email": "tpo@vasavi.ac.in", "name": "Dr. Suresh Kumar", "role": "tpo", "institution_id": "inst_vasavi_pending", "approved": False},
    ]
    for d in demo_users:
        existing = await db.users.find_one({"email": d["email"]})
        if existing is None:
            new = _new_user(
                email=d["email"], name=d["name"], role=d["role"],
                institution_id=d.get("institution_id"),
                department=d.get("department"),
                password=DEFAULT_DEMO_PASSWORD if d["role"] != "super_admin" else ADMIN_PASSWORD,
                approved=d.get("approved", True),
            )
            # Bind student demo to a real seeded student row AND patch the student record
            # to match the User's display name so UI stays consistent across views.
            if d["role"] == "student":
                real_stu = await db.students.find_one(
                    {"institution_id": "inst_kmit", "department": "CSE"}, {"_id": 0}
                )
                if real_stu:
                    new["student_id"] = real_stu["student_id"]
                    await db.students.update_one(
                        {"student_id": real_stu["student_id"]},
                        {"$set": {"name": d["name"], "email": d["email"]}},
                    )
            try:
                await db.users.insert_one(new)
            except Exception as e:
                log.warning("Skipping user %s: %s", d["email"], e)
        else:
            # Refresh password if missing or admin-password-changed
            if not existing.get("password_hash"):
                pw = ADMIN_PASSWORD if d["role"] == "super_admin" else DEFAULT_DEMO_PASSWORD
                await db.users.update_one({"email": d["email"]}, {"$set": {"password_hash": hash_password(pw)}})
            # Ensure student↔student_id link is set and student name matches
            if d["role"] == "student" and not existing.get("student_id"):
                real_stu = await db.students.find_one(
                    {"institution_id": "inst_kmit", "department": "CSE"}, {"_id": 0}
                )
                if real_stu:
                    await db.users.update_one(
                        {"email": d["email"]},
                        {"$set": {"student_id": real_stu["student_id"]}},
                    )
                    await db.students.update_one(
                        {"student_id": real_stu["student_id"]},
                        {"$set": {"name": d["name"], "email": d["email"]}},
                    )

    # Pending college doc for approval flow
    if not await db.institutions.find_one({"institution_id": "inst_vasavi_pending"}):
        await db.institutions.insert_one({
            "institution_id": "inst_vasavi_pending",
            "name": "Vasavi College of Engineering",
            "short_name": "VCE",
            "type": "Engineering",
            "city": "Hyderabad", "state": "Telangana",
            "affiliated_university": "Osmania University",
            "departments": ["CSE", "ECE", "IT"],
            "approved": False,
            "created_at": datetime.now(timezone.utc).isoformat(),
        })


# ============== HEALTH ==============
@app.get("/api/health")
async def health():
    return {"status": "ok", "service": "careeros-v2"}


@app.post("/api/test/reset-pending")
async def test_reset_pending():
    await db.users.update_one({"email": "tpo@vasavi.ac.in"}, {"$set": {"approved": False}})
    await db.institutions.update_one({"institution_id": "inst_vasavi_pending"}, {"$set": {"approved": False}})
    return {"ok": True}


@app.get("/api/health/deep")
async def deep_health():
    checks = {
        "database": "mongo" if MONGO_URL else "memory",
        "students": await db.students.count_documents({}),
        "institutions": await db.institutions.count_documents({}),
        "recruiters": await db.recruiters.count_documents({}),
        "jobs_open": await db.jobs.count_documents({"status": "open"}),
        "frontend_build": FRONTEND_BUILD.exists(),
    }
    ready = checks["students"] > 0 and checks["institutions"] > 0 and checks["recruiters"] > 0
    return {
        "status": "ready" if ready else "degraded",
        "service": "careeros-v3",
        "release": "v3-phases-7-10",
        "checks": checks,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ============== PUBLIC ==============
@app.get("/api/public/landing-stats")
async def landing_stats():
    years = await db.year_summaries.find({"institution_id": "inst_kmit"}, {"_id": 0}).sort("academic_year", -1).to_list(20)
    pipeline = [
        {"$match": {"institution_id": "inst_kmit"}},
        {"$group": {"_id": "$company", "selects": {"$sum": "$selects"}, "max_ctc": {"$max": "$ctc_lpa"}}},
        {"$sort": {"selects": -1}}, {"$limit": 24},
    ]
    top = await db.placement_records.aggregate(pipeline).to_list(40)
    top = [{"company": r["_id"], "selects": r["selects"], "max_ctc": r["max_ctc"]} for r in top]
    n_students = await db.students.count_documents({})
    n_inst = await db.institutions.count_documents({"approved": True})
    return {"years": years, "top_recruiters": top, "totals": {"students": n_students, "institutions": n_inst}}


# ============== AUTH ==============
@app.post("/api/auth/login")
async def login(body: LoginBody, request: Request, response: Response):
    email = body.email.lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("password_hash") or not verify_password(body.password, user["password_hash"]):
        await _audit_log(
            "auth.login_failed",
            outcome="failure",
            metadata={"email": email},
            request=request,
        )
        raise HTTPException(401, "Invalid email or password")
    access_token = await _create_session(user["user_id"], response, request)
    user.pop("_id", None); user.pop("password_hash", None)
    await _audit_log("auth.login", user=user, request=request)
    return {"user": user, "access_token": access_token, "token_type": "bearer"}


@app.post("/api/auth/session")
async def auth_session(request: Request, response: Response):
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(400, "session_id required")
    async with httpx.AsyncClient(timeout=15) as hx:
        r = await hx.get(EMERGENT_AUTH_URL, headers={"X-Session-ID": session_id})
        if r.status_code != 200:
            raise HTTPException(401, "Emergent auth failed")
        data = r.json()
    email = data["email"].lower()
    existing = await db.users.find_one({"email": email})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one({"user_id": user_id}, {"$set": {"name": data.get("name", existing["name"]), "picture": data.get("picture")}})
    else:
        is_admin = email == ADMIN_EMAIL
        new = _new_user(email=email, name=data.get("name", email), role="super_admin" if is_admin else "tpo",
                        institution_id=None, password=None, approved=is_admin)
        new["picture"] = data.get("picture")
        await db.users.insert_one(new)
        user_id = new["user_id"]
    access_token = await _create_session(user_id, response, request, token=data.get("session_token"))
    user_doc = await db.users.find_one({"user_id": user_id}, {"_id": 0, "password_hash": 0})
    await _audit_log("auth.oauth_session", user=user_doc, request=request)
    return {"user": user_doc, "access_token": access_token, "token_type": "bearer"}


@app.get("/api/auth/me")
async def auth_me(user=Depends(get_session_user)):
    return user


@app.post("/api/auth/logout")
async def auth_logout(request: Request, response: Response, user=Depends(get_session_user)):
    token = request.cookies.get("session_token")
    auth = request.headers.get("authorization", "")
    if auth.lower().startswith("bearer "):
        token = auth[7:].strip()
    if token:
        if token.count(".") == 2:
            try:
                claims = decode_access_token(token)
                await db.user_sessions.delete_one({"jwt_id": claims["jti"]})
            except HTTPException:
                await db.user_sessions.delete_one({"session_token": token})
        else:
            await db.user_sessions.delete_one({"session_token": token})
    secure_cookie = _cookie_secure(request)
    response.delete_cookie("session_token", path="/", secure=secure_cookie, samesite="none" if secure_cookie else "lax")
    await _audit_log("auth.logout", user=user, request=request)
    return {"ok": True}


# ============== SIGNUP / ONBOARDING ==============
@app.post("/api/signup")
async def signup(payload: SignupBody, request: Request, user=Depends(get_session_user)):
    if user.get("approved") and user.get("institution_id"):
        return {"status": "already-onboarded"}
    short = payload.short_name or "".join(w[0] for w in payload.college_name.split()).upper()[:6]
    inst_id = f"inst_{uuid.uuid4().hex[:10]}"
    await db.institutions.insert_one({
        "institution_id": inst_id,
        "name": payload.college_name, "short_name": short, "type": "Engineering",
        "affiliated_university": payload.affiliated_university,
        "departments": ["CSE", "IT", "CSE-AIML", "CSE-DS"],
        "partnership_types": [payload.partnership_type or "CRT"],
        "approved": False, "created_at": datetime.now(timezone.utc).isoformat(),
    })
    await db.users.update_one({"user_id": user["user_id"]}, {"$set": {
        "role": payload.role, "institution_id": inst_id,
        "department": payload.department, "approved": False,
    }})
    await notify(db, event="signup_requested", to_email=ADMIN_EMAIL,
                 subject=f"New TPO signup — {payload.college_name}",
                 title="New partner signup",
                 body_html=f"<p>{user['name']} ({user['email']}) requested onboarding for <b>{payload.college_name}</b>.</p>",
                 telegram_text=f"🆕 TPO signup · {payload.college_name}")
    await _audit_log(
        "institution.signup_requested",
        user={**user, "institution_id": inst_id, "role": payload.role},
        institution_id=inst_id,
        resource="institution",
        resource_id=inst_id,
        metadata={"college_name": payload.college_name, "requested_role": payload.role},
        request=request,
    )
    return {"status": "pending_approval", "institution_id": inst_id}


# ============== INSTITUTIONS ==============
@app.get("/api/institutions")
async def list_institutions(user=Depends(get_session_user)):
    if user["role"] == "super_admin":
        items = await db.institutions.find({}, {"_id": 0}).to_list(500)
    elif user.get("institution_id"):
        items = await db.institutions.find({"institution_id": user["institution_id"]}, {"_id": 0}).to_list(10)
    else:
        items = []
    return {"items": items}


@app.get("/api/institutions/{institution_id}")
async def get_institution(institution_id: str, user=Depends(get_session_user)):
    if user["role"] != "super_admin" and user.get("institution_id") != institution_id:
        raise HTTPException(403, "Cross-institution access denied")
    inst = await db.institutions.find_one({"institution_id": institution_id}, {"_id": 0})
    if not inst:
        raise HTTPException(404, "not found")
    return inst


@app.patch("/api/institutions/{institution_id}")
async def update_institution(
    institution_id: str,
    body: dict,
    request: Request,
    user=Depends(require_roles("super_admin", "institution_admin", "tpo")),
):
    require_same_institution(institution_id, user)
    allowed = {"name", "short_name", "city", "state", "affiliated_university", "departments", "tagline", "website"}
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        return {"updated": 0}
    r = await db.institutions.update_one({"institution_id": institution_id}, {"$set": update})
    await _audit_log(
        "institution.updated",
        user=user,
        institution_id=institution_id,
        resource="institution",
        resource_id=institution_id,
        metadata={"fields": sorted(update.keys())},
        request=request,
    )
    return {"updated": r.modified_count}


@app.get("/api/institutions/{institution_id}/departments")
async def list_departments(institution_id: str, user=Depends(get_session_user)):
    if user["role"] != "super_admin" and user.get("institution_id") != institution_id:
        raise HTTPException(403, "forbidden")
    items = await db.departments.find({"institution_id": institution_id}, {"_id": 0}).to_list(50)
    return {"items": items}


# ============== STUDENTS ==============
@app.get("/api/students")
async def list_students(
    department: Optional[str] = None, placed: Optional[bool] = None,
    q: Optional[str] = None, limit: int = 200,
    user=Depends(get_session_user),
):
    query: dict = {}
    if user["role"] != "super_admin":
        if not user.get("institution_id"):
            return {"items": [], "count": 0}
        query["institution_id"] = user["institution_id"]
    if user["role"] == "faculty" and user.get("department"):
        query["department"] = user["department"]
    if department:
        query["department"] = department
    if placed is not None:
        query["placement.placed"] = placed
    if q:
        query["$or"] = [{"name": {"$regex": q, "$options": "i"}}, {"roll_number": {"$regex": q, "$options": "i"}}]
    items = await db.students.find(query, {"_id": 0}).limit(limit).to_list(limit)
    return {"items": items, "count": len(items)}


@app.post("/api/students")
async def add_student(
    body: dict,
    request: Request,
    user=Depends(require_roles("super_admin", "tpo", "institution_admin", "faculty")),
):
    body["student_id"] = body.get("student_id") or f"stu_{uuid.uuid4().hex[:10]}"
    if user["role"] == "super_admin":
        if not body.get("institution_id"):
            raise HTTPException(400, "institution_id required")
    else:
        if not user.get("institution_id"):
            raise HTTPException(403, "Institution scope required")
        body["institution_id"] = user["institution_id"]
        if user["role"] == "faculty" and user.get("department"):
            body["department"] = user["department"]
    body.setdefault("placement", {"placed": False})
    body.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    await db.students.insert_one(body)
    await _audit_log(
        "student.created",
        user=user,
        institution_id=body.get("institution_id"),
        resource="student",
        resource_id=body["student_id"],
        metadata={"department": body.get("department")},
        request=request,
    )
    return {"student_id": body["student_id"]}


@app.get("/api/students/{student_id}")
async def get_student(student_id: str, user=Depends(get_session_user)):
    s = await db.students.find_one({"student_id": student_id}, {"_id": 0})
    if not s:
        raise HTTPException(404, "not found")
    if user["role"] not in ("super_admin",) and s["institution_id"] != user.get("institution_id"):
        raise HTTPException(403, "forbidden")
    enrolls = await db.enrollments.find({"student_id": student_id}, {"_id": 0}).to_list(20)
    apps = await db.applications.find({"student_id": student_id}, {"_id": 0}).to_list(20)
    return {"student": s, "enrollments": enrolls, "applications": apps}


# ============== STUDENT PERSONAL (logged-in student) ==============
@app.get("/api/me/dashboard")
async def my_dashboard(user=Depends(require_roles("student"))):
    sid, s = await _resolve_student_for_user(user)
    if not s:
        raise HTTPException(404, "no student record bound")
    await _ensure_student_dsa_catalog(s)
    dsa = await db.dsa_progress.find(
        {"student_id": sid, "topic_code": {"$in": DSA_TOPIC_CODES}},
        {"_id": 0},
    ).sort("topic_order", 1).to_list(50)
    apt = await db.aptitude_scores.find({"student_id": sid}, {"_id": 0}).to_list(20)
    ats = await db.ats_reports.find({"student_id": sid}, {"_id": 0}).sort("created_at", -1).limit(1).to_list(1)
    interviews = await db.interview_reports.find({"student_id": sid}, {"_id": 0}).sort("conducted_at", -1).limit(10).to_list(10)
    apps = await db.applications.find({"student_id": sid}, {"_id": 0}).sort("applied_at", -1).limit(20).to_list(20)
    readiness = await build_student_readiness(db, s)
    s["readiness_score"] = readiness["score"]
    s["readiness_band"] = readiness["band"]
    s["readiness_label"] = readiness["label"]
    # Recommendations: open jobs for this student's institution + stream
    inst_id = s["institution_id"]
    recs = await db.jobs.find({"institutions": inst_id, "status": "open"}, {"_id": 0}).limit(6).to_list(6)
    return {
        "student": s, "dsa": dsa, "aptitude": apt,
        "ats": ats[0] if ats else None, "interviews": interviews,
        "applications": apps, "recommended_jobs": recs,
        "readiness_engine": readiness,
        "topics": STRIVER_TOPICS, "aptitude_sections": APTITUDE_SECTIONS,
        "dsa_total": DSA_TOTAL,
    }


# ============== ROLE WORKSPACES ==============
@app.get("/api/workspace/me")
async def my_workspace(user=Depends(get_session_user)):
    role = user.get("role")
    name = _first_name(user.get("name"), "there")

    if role == "student":
        sid, student = await _resolve_student_for_user(user)
        if not student:
            raise HTTPException(404, "no student record bound")
        await _ensure_student_dsa_catalog(student)
        readiness = await build_student_readiness(db, student)
        apps = await db.applications.find({"student_id": sid}, {"_id": 0}).sort("applied_at", -1).limit(20).to_list(20)
        active_apps = [app for app in apps if app.get("stage") not in {"Rejected", "Selected"}]
        jobs = await db.jobs.find(
            {"institutions": {"$in": [student.get("institution_id")]}, "status": "open"},
            {"_id": 0},
        ).sort("drive_date", -1).limit(6).to_list(6)
        signals = readiness.get("signals", {})
        dsa_signal = signals.get("dsa", {})
        ats_signal = signals.get("ats", {})
        return {
            "role": role,
            "title": "Personal Placement OS",
            "eyebrow": "Student workspace",
            "headline": f"Hi {name}. Your next placement moves are ranked.",
            "subtitle": f"{readiness['label']} at {readiness['score']}/100 across DSA, ATS, aptitude, interviews, CGPA, and consistency.",
            "scope": {"institution_id": student.get("institution_id"), "student_id": sid, "department": student.get("department")},
            "kpis": [
                _workspace_kpi("Readiness", readiness["score"], unit="/100", sub=readiness["label"], status=readiness["band"], to="/student"),
                _workspace_kpi("DSA solved", dsa_signal.get("solved", 0), sub=f"of {dsa_signal.get('total', DSA_TOTAL)} A2Z questions", to="/student/dsa"),
                _workspace_kpi("ATS score", ats_signal.get("score", 0), unit="/100", sub=ats_signal.get("source", "profile"), to="/student/applications"),
                _workspace_kpi("Active applications", len(active_apps), sub=f"{len(apps)} total tracked", to="/student/applications"),
            ],
            "actions": [
                _workspace_action(rec["action"], "/student/dsa" if rec["area"] == "dsa" else "/student/applications", priority="high", reason=rec["area"])
                for rec in readiness.get("recommendations", [])
            ],
            "alerts": [
                _workspace_alert(risk["area"].upper(), risk["message"], severity=risk["severity"], to="/student")
                for risk in readiness.get("risks", [])[:3]
            ],
            "sections": {
                "student": student,
                "readiness": readiness,
                "applications": apps,
                "recommended_jobs": jobs,
            },
        }

    if role == "recruiter":
        recruiter_id = await _resolve_recruiter_id(user)
        recruiter = await db.recruiters.find_one({"recruiter_id": recruiter_id}, {"_id": 0}) if recruiter_id else None
        jobs = await db.jobs.find({"recruiter_id": recruiter_id or "__none__"}, {"_id": 0}).sort("drive_date", -1).limit(120).to_list(120)
        job_ids = [job["job_id"] for job in jobs]
        app_query = {"job_id": {"$in": job_ids}} if job_ids else {"job_id": "__none__"}
        applications = await db.applications.find(app_query, {"_id": 0}).sort("applied_at", -1).limit(500).to_list(500)
        pipeline = _pipeline_counts(applications)
        talent = await _recruiter_talent_pool_payload(recruiter_id, min_cgpa=6.5, limit=24)
        open_jobs = [job for job in jobs if job.get("status") == "open"]
        return {
            "role": role,
            "title": "Talent Intelligence Platform",
            "eyebrow": "Recruiter workspace",
            "headline": f"Hi {name}. Your hiring funnel is live.",
            "subtitle": "Qualified students, open roles, and interview movement across partner institutions.",
            "scope": {"recruiter_id": recruiter_id, "company": recruiter.get("name") if recruiter else None},
            "kpis": [
                _workspace_kpi("Open roles", len(open_jobs), sub=f"{len(jobs)} total drives", to="/recruiter/jobs"),
                _workspace_kpi("Talent pool", talent["count"], sub="ranked by readiness", to="/recruiter/talent"),
                _workspace_kpi("In pipeline", sum(pipeline.values()), sub=f"{pipeline.get('Interview', 0)} interviews", to="/recruiter/applications"),
                _workspace_kpi("Selected", pipeline.get("Selected", 0), sub="conversion wins", status="strong", to="/recruiter/applications"),
            ],
            "actions": [
                _workspace_action("Review top-ready candidates", "/recruiter/talent", priority="high", reason="Talent ranked by readiness score"),
                _workspace_action("Move shortlisted candidates forward", "/recruiter/applications", priority="medium", reason="Pipeline stages need recruiter action"),
                _workspace_action("Schedule interview slots", "/recruiter/schedule", priority="medium", reason="Convert interview-ready candidates"),
            ],
            "alerts": [
                _workspace_alert("Interview backlog", f"{pipeline.get('Interview', 0)} candidates are waiting in Interview.", severity="medium", to="/recruiter/applications")
            ] if pipeline.get("Interview", 0) else [],
            "sections": {
                "recruiter": recruiter,
                "jobs": jobs,
                "applications": applications,
                "pipeline": pipeline,
                "talent": talent["items"],
            },
        }

    if role == "super_admin":
        n_inst = await db.institutions.count_documents({"approved": True})
        n_pending = await db.users.count_documents({"approved": False})
        n_students = await db.students.count_documents({})
        n_apps = await db.applications.count_documents({})
        n_jobs_open = await db.jobs.count_documents({"status": "open"})
        n_recruiters = await db.recruiters.count_documents({})
        placed = await db.students.count_documents({"placement.placed": True})
        estimated_mrr = round(placed * 0.18 * 6 * 1000 / 12, 0)
        by_type = await db.institutions.aggregate([{"$group": {"_id": "$type", "n": {"$sum": 1}}}]).to_list(20)
        pending = await db.users.find({"approved": False}, {"_id": 0, "password_hash": 0}).limit(8).to_list(8)
        audit = await db.audit_logs.find({}, {"_id": 0}).sort("created_at", -1).limit(12).to_list(12)
        return {
            "role": role,
            "title": "Platform Control",
            "eyebrow": "Super admin workspace",
            "headline": f"Good morning, {name}. The platform layer is visible.",
            "subtitle": "Institutions, recruiter network, pending onboarding, audit trail, and revenue proxy in one command surface.",
            "scope": {"platform": "global"},
            "kpis": [
                _workspace_kpi("Institutions", n_inst, sub="approved partners", to="/platform/institutions"),
                _workspace_kpi("Pending signups", n_pending, sub="awaiting decision", status="watch", to="/platform/institutions"),
                _workspace_kpi("Open drives", n_jobs_open, sub=f"{n_recruiters} recruiters", to="/platform/recruiters"),
                _workspace_kpi("MRR proxy", estimated_mrr, unit="INR", sub="revenue-share estimate", to="/platform"),
            ],
            "actions": [
                _workspace_action("Review pending onboarding", "/platform/institutions", priority="high", reason=f"{n_pending} accounts need approval"),
                _workspace_action("Inspect recruiter network", "/platform/recruiters", priority="medium", reason="Network health drives marketplace liquidity"),
                _workspace_action("Check audit activity", "/platform", priority="medium", reason="Security and operations visibility"),
            ],
            "alerts": [
                _workspace_alert("Pending onboarding", f"{n_pending} institution users are waiting for approval.", severity="high", to="/platform/institutions")
            ] if n_pending else [],
            "sections": {
                "stats": {
                    "institutions": n_inst,
                    "pending_signups": n_pending,
                    "students": n_students,
                    "applications": n_apps,
                    "jobs_open": n_jobs_open,
                    "recruiters": n_recruiters,
                    "estimated_mrr_inr": estimated_mrr,
                    "by_type": [{"type": row["_id"], "count": row["n"]} for row in by_type],
                },
                "pending": pending,
                "audit": audit,
            },
        }

    iid = user.get("institution_id") or "inst_kmit"
    department = user.get("department") if role == "faculty" else None
    operating = await _institution_operating_data(iid, department=department)
    inst = operating["institution"]
    readiness = operating["readiness"]
    pipeline = operating["pipeline"]
    latest = operating["latest_year"]

    if role == "faculty":
        component_avgs = readiness.get("component_avgs", {})
        weak = readiness.get("weak_students", [])
        return {
            "role": role,
            "title": "Faculty Batch Intelligence",
            "eyebrow": f"{department or 'Department'} workspace",
            "headline": f"Hi {name}. Your batch risks are already ranked.",
            "subtitle": "Weak student detection across DSA, aptitude, interviews, ATS, consistency, and placement readiness.",
            "scope": {"institution_id": iid, "department": department},
            "kpis": [
                _workspace_kpi("Batch size", readiness.get("count", 0), sub=department or "department", to="/faculty/roster"),
                _workspace_kpi("Readiness avg", readiness.get("avg_readiness", 0), unit="/100", sub=f"{readiness.get('needs_intervention', 0)} need intervention", to="/faculty/roster"),
                _workspace_kpi("DSA avg", component_avgs.get("dsa", 0), unit="/100", sub="question-level A2Z progress", to="/faculty/dsa"),
                _workspace_kpi("Aptitude avg", component_avgs.get("aptitude", 0), unit="/100", sub=f"training avg {operating['training_avg']}%", to="/faculty/aptitude"),
            ],
            "actions": [
                _workspace_action("Open intervention roster", "/faculty/roster", priority="high", reason=f"{len(weak)} lowest readiness students"),
                _workspace_action("Review DSA topic gaps", "/faculty/dsa", priority="high", reason="Question-level DSA signal is now available"),
                _workspace_action("Check interview reports", "/faculty/interviews", priority="medium", reason="Communication and technical rubrics need follow-up"),
            ],
            "alerts": [
                _workspace_alert("Weak student queue", f"{readiness.get('needs_intervention', 0)} students need structured intervention.", severity="high", to="/faculty/roster"),
                _workspace_alert("DSA depth", f"Department DSA component is {component_avgs.get('dsa', 0)}/100.", severity="medium", to="/faculty/dsa"),
            ],
            "sections": operating,
        }

    if role == "institution_admin":
        title = "Institution Mission Control"
        eyebrow = f"{inst.get('short_name', 'Institution')} workspace"
        headline = f"Good morning, {name}. {inst.get('short_name', 'Your institution')} health is ready."
        subtitle = "Department health, recruiter pipeline, readiness, and board-report decisions for the institution layer."
        route = "/institution"
        actions = [
            _workspace_action("Review department health", "/institution/departments", priority="high", reason="Compare placed, ready, and intervention counts"),
            _workspace_action("Export board reports", "/institution/reports", priority="medium", reason="Leadership needs current placement and training packets"),
            _workspace_action("Coordinate announcements", "/institution/announcements", priority="medium", reason="Broadcast decisions to students and staff"),
        ]
    else:
        title = "Placement Command Center"
        eyebrow = f"{inst.get('short_name', 'TPO')} live workspace"
        headline = f"Good morning, {name}. The placement pipeline needs decisions."
        subtitle = "Open drives, application flow, interview scheduling, readiness risks, and recruiter movement for the TPO team."
        route = "/tpo"
        actions = [
            _workspace_action("Move application pipeline", "/tpo/applications", priority="high", reason=f"{sum(pipeline.values())} candidates across stages"),
            _workspace_action("Schedule interview slots", "/tpo/schedule", priority="high", reason=f"{pipeline.get('Interview', 0)} candidates are interview-stage"),
            _workspace_action("Review readiness risks", "/tpo/roster", priority="medium", reason=f"{readiness.get('needs_intervention', 0)} students need intervention"),
        ]

    alerts = []
    if readiness.get("needs_intervention", 0):
        alerts.append(_workspace_alert(
            "Readiness intervention",
            f"{readiness['needs_intervention']} students are below placement readiness threshold.",
            severity="high",
            to=f"{route}/roster" if role == "tpo" else "/institution/departments",
        ))
    if pipeline.get("Interview", 0):
        alerts.append(_workspace_alert(
            "Interview queue",
            f"{pipeline['Interview']} candidates are waiting for interview coordination.",
            severity="medium",
            to=f"{route}/schedule",
        ))

    return {
        "role": role,
        "title": title,
        "eyebrow": eyebrow,
        "headline": headline,
        "subtitle": subtitle,
        "scope": {"institution_id": iid, "institution": inst.get("short_name"), "department": department},
        "kpis": [
            _workspace_kpi("Placement rate", operating["placement_rate"], unit="%", sub=f"{operating['students_placed']}/{operating['students_total']} placed", to=f"{route}/outcomes" if role == "tpo" else "/institution/departments"),
            _workspace_kpi("Readiness avg", readiness.get("avg_readiness", 0), unit="/100", sub=f"{readiness.get('placement_ready', 0)} placement ready", to=f"{route}/roster" if role == "tpo" else "/institution/departments"),
            _workspace_kpi("Open drives", len(operating["open_jobs"]), sub=f"{latest.get('companies', 0)} recruiters this year", to=f"{route}/jobs" if role == "tpo" else "/institution/programs"),
            _workspace_kpi("Training avg", operating["training_avg"], unit="%", sub=f"{operating['scheduled_interviews']} scheduled interviews", to=f"{route}/training" if role == "tpo" else "/institution/programs"),
        ],
        "actions": actions,
        "alerts": alerts,
        "sections": operating,
    }


# ============== DSA INTELLIGENCE ==============
@app.get("/api/dsa/topics")
async def dsa_topics():
    return {"topics": STRIVER_TOPICS, "total": DSA_TOTAL}


@app.get("/api/dsa/questions")
async def dsa_questions(user=Depends(get_session_user)):
    questions = await db.dsa_questions.find({}, {"_id": 0}).sort("global_order", 1).to_list(DSA_TOTAL)
    return {"questions": questions, "topics": STRIVER_TOPICS, "total": DSA_TOTAL}


@app.get("/api/me/dsa/questions")
async def my_dsa_questions(user=Depends(require_roles("student"))):
    _sid, student = await _resolve_student_for_user(user)
    if not student:
        raise HTTPException(404, "no student record bound")
    return await _student_dsa_question_payload(student)


@app.get("/api/dsa/student/{student_id}/questions")
async def get_student_dsa_questions(student_id: str, user=Depends(require_roles("faculty", "tpo", "institution_admin", "super_admin"))):
    student = await db.students.find_one({"student_id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(404, "student not found")
    if user["role"] != "super_admin":
        require_same_institution(student.get("institution_id", ""), user)
    return await _student_dsa_question_payload(student)


@app.patch("/api/me/dsa/questions/{question_id}")
async def update_my_dsa_question(question_id: str, body: dict, request: Request, user=Depends(require_roles("student"))):
    _sid, student = await _resolve_student_for_user(user)
    if not student:
        raise HTTPException(404, "no student record bound")
    question = await db.dsa_questions.find_one({"question_id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(404, "question not found")

    existing = await db.dsa_question_progress.find_one(
        {"student_id": student["student_id"], "question_id": question_id},
        {"_id": 0},
    ) or {}
    now = datetime.now(timezone.utc).isoformat()
    solved = bool(body.get("solved", existing.get("solved", False)))
    attempted = bool(body.get("attempted", existing.get("attempted", False)) or solved)
    mastery = int(body.get("mastery", existing.get("mastery", 85 if solved else 35) or 0))
    mastery = max(0, min(100, mastery))
    revision_count = int(existing.get("revision_count", 0) or 0)
    if "revision_count" in body:
        revision_count = int(body.get("revision_count") or 0)
    if "revision_delta" in body:
        revision_count += int(body.get("revision_delta") or 0)
    revision_count = max(0, revision_count)
    update = {
        "progress_id": existing.get("progress_id") or f"dsqp_{uuid.uuid4().hex[:10]}",
        "student_id": student["student_id"],
        "institution_id": student["institution_id"],
        "question_id": question_id,
        "topic_code": question["topic_code"],
        "subtopic_code": question["subtopic_code"],
        "solved": solved,
        "attempted": attempted,
        "mastery": mastery,
        "revision_count": revision_count,
        "notes": body.get("notes", existing.get("notes", "")),
        "faculty_comments": existing.get("faculty_comments", []),
        "difficulty": question["difficulty"],
        "last_solved_at": now if solved else existing.get("last_solved_at"),
        "updated_at": now,
    }
    await db.dsa_question_progress.update_one(
        {"student_id": student["student_id"], "question_id": question_id},
        {"$set": update},
        upsert=True,
    )
    topic_row = await _sync_topic_progress_from_questions(student, question["topic_code"])
    await _audit_log(
        "dsa.question_progress_updated",
        user=user,
        institution_id=student["institution_id"],
        resource="dsa_question",
        resource_id=question_id,
        metadata={"topic_code": question["topic_code"], "solved": solved, "attempted": attempted},
        request=request,
    )
    return {"question": {**question, **update}, "topic": topic_row}


@app.get("/api/dsa/intelligence")
async def dsa_intelligence(user=Depends(get_session_user)):
    iid = user.get("institution_id")
    if not iid:
        return {"by_topic": [], "leaderboard": []}
    # Faculty narrows to their department
    student_match = {"institution_id": iid}
    if user["role"] == "faculty" and user.get("department"):
        student_match["department"] = user["department"]
    dept_students = await db.students.find(student_match, {"_id": 0, "student_id": 1}).to_list(1000)
    dept_sids = [s["student_id"] for s in dept_students] if user["role"] == "faculty" else None

    match = {"institution_id": iid, "topic_code": {"$in": DSA_TOPIC_CODES}}
    if dept_sids is not None:
        match["student_id"] = {"$in": dept_sids}
    pipeline = [
        {"$match": match},
        {"$group": {"_id": "$topic_code", "topic_name": {"$first": "$topic_name"},
                    "topic_order": {"$first": "$topic_order"},
                    "total": {"$first": "$total"}, "solved": {"$sum": "$solved"},
                    "students": {"$sum": 1}}},
        {"$sort": {"topic_order": 1}},
    ]
    by_topic = await db.dsa_progress.aggregate(pipeline).to_list(30)
    by_topic.sort(key=lambda row: DSA_TOPIC_BY_CODE.get(row["_id"], {}).get("order", 999))

    leaderboard_pipe = [
        {"$match": match},
        {"$group": {"_id": "$student_id", "solved": {"$sum": "$solved"}}},
        {"$sort": {"solved": -1}},
        {"$limit": 20},
    ]
    lb = await db.dsa_progress.aggregate(leaderboard_pipe).to_list(30)
    sids = [r["_id"] for r in lb]
    students = await db.students.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(30)
    smap = {s["student_id"]: s for s in students}
    leaderboard = []
    for r in lb:
        s = smap.get(r["_id"], {})
        readiness = await build_student_readiness(db, s) if s else None
        leaderboard.append({
            "student_id": r["_id"], "name": s.get("name", "—"),
            "roll_number": s.get("roll_number", "—"), "department": s.get("department", "—"),
            "solved": r["solved"],
            "readiness": readiness["score"] if readiness else min(100, round(r["solved"] / DSA_TOTAL * 100, 1)),
            "readiness_band": readiness["band"] if readiness else None,
        })
    return {
        "by_topic": by_topic, "leaderboard": leaderboard, "total_problems": DSA_TOTAL,
        "scope": ("department:" + user["department"]) if user["role"] == "faculty" and user.get("department") else "institution",
    }


@app.post("/api/me/dsa/toggle")
async def dsa_toggle(body: dict, user=Depends(require_roles("student"))):
    """Increment/decrement solved count by marking a real question in the topic."""
    _sid, student = await _resolve_student_for_user(user)
    topic = body.get("topic_code")
    delta = int(body.get("delta", 1))
    if not (student and topic):
        raise HTTPException(400, "topic_code required")
    if topic not in DSA_TOPIC_BY_CODE:
        raise HTTPException(404, "topic not found")
    await _ensure_student_dsa_catalog(student)
    questions = await db.dsa_questions.find({"topic_code": topic}, {"_id": 0}).sort("order", 1).to_list(600)
    progress_rows = await db.dsa_question_progress.find(
        {"student_id": student["student_id"], "question_id": {"$in": [q["question_id"] for q in questions]}},
        {"_id": 0},
    ).to_list(600)
    progress_by_question = {row["question_id"]: row for row in progress_rows}
    target = None
    now = datetime.now(timezone.utc).isoformat()
    if delta >= 0:
        for question in questions:
            if not progress_by_question.get(question["question_id"], {}).get("solved"):
                target = question
                break
        if target:
            existing = progress_by_question.get(target["question_id"], {})
            await db.dsa_question_progress.update_one(
                {"student_id": student["student_id"], "question_id": target["question_id"]},
                {"$set": {
                    "progress_id": existing.get("progress_id") or f"dsqp_{uuid.uuid4().hex[:10]}",
                    "student_id": student["student_id"],
                    "institution_id": student["institution_id"],
                    "question_id": target["question_id"],
                    "topic_code": target["topic_code"],
                    "subtopic_code": target["subtopic_code"],
                    "solved": True,
                    "attempted": True,
                    "mastery": max(82, int(existing.get("mastery", 0) or 0)),
                    "revision_count": int(existing.get("revision_count", 0) or 0),
                    "notes": existing.get("notes", ""),
                    "faculty_comments": existing.get("faculty_comments", []),
                    "difficulty": target["difficulty"],
                    "last_solved_at": now,
                    "updated_at": now,
                }},
                upsert=True,
            )
    else:
        for question in reversed(questions):
            if progress_by_question.get(question["question_id"], {}).get("solved"):
                target = question
                break
        if target:
            existing = progress_by_question.get(target["question_id"], {})
            await db.dsa_question_progress.update_one(
                {"student_id": student["student_id"], "question_id": target["question_id"]},
                {"$set": {
                    **existing,
                    "student_id": student["student_id"],
                    "institution_id": student["institution_id"],
                    "question_id": target["question_id"],
                    "topic_code": target["topic_code"],
                    "subtopic_code": target["subtopic_code"],
                    "solved": False,
                    "attempted": True,
                    "mastery": min(50, int(existing.get("mastery", 35) or 35)),
                    "difficulty": target["difficulty"],
                    "updated_at": now,
                }},
                upsert=True,
            )
    row = await _sync_topic_progress_from_questions(student, topic)
    return {"solved": row["solved"], "attempted": row["attempted"], "total": row["total"]}


# ============== READINESS INTELLIGENCE ==============
@app.get("/api/readiness/me")
async def my_readiness(user=Depends(require_roles("student"))):
    sid = user.get("student_id")
    if not sid:
        raise HTTPException(404, "no student record bound")
    student = await db.students.find_one({"student_id": sid}, {"_id": 0})
    if not student:
        raise HTTPException(404, "student not found")
    readiness = await build_student_readiness(db, student)
    return {"student": student, "readiness": readiness}


@app.get("/api/readiness/students")
async def readiness_students(
    department: Optional[str] = None,
    limit: int = 200,
    user=Depends(require_roles("super_admin", "institution_admin", "tpo", "faculty")),
):
    institution_id = user.get("institution_id") or "inst_kmit"
    scoped_department = department
    if user["role"] == "faculty" and user.get("department"):
        scoped_department = user["department"]
    roster = await build_readiness_roster(
        db,
        institution_id=institution_id,
        department=scoped_department,
        limit=limit,
    )
    roster["scope"] = (
        f"department:{scoped_department}"
        if scoped_department
        else "institution"
    )
    return roster


# ============== APTITUDE INTELLIGENCE ==============
async def _aptitude_question_analytics(user: dict, department: Optional[str] = None) -> dict:
    iid, scoped_department, students = await _student_scope_for_user(user, department=department)
    if not iid:
        return {"questions": [], "topics": [], "sections": [], "priority_students": []}
    await _ensure_aptitude_progress_for_students(students)
    sids = [student["student_id"] for student in students]
    smap = {student["student_id"]: student for student in students}
    progress = await db.aptitude_question_progress.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(50000)
    questions = await db.aptitude_questions.find({}, {"_id": 0}).sort("global_order", 1).to_list(1000)
    qmap = {question["question_id"]: question for question in questions}

    by_topic: dict[str, dict[str, Any]] = {}
    by_section: dict[str, dict[str, Any]] = {}
    by_student: dict[str, dict[str, Any]] = {}
    for row in progress:
        question = qmap.get(row["question_id"], {})
        topic_key = f"{row.get('section_code')}::{row.get('topic')}"
        topic = by_topic.setdefault(topic_key, {
            "section_code": row.get("section_code"),
            "section": row.get("section"),
            "topic": row.get("topic"),
            "difficulty_mix": {},
            "attempted": 0,
            "solved": 0,
            "accuracy_sum": 0,
            "speed_sum": 0,
            "mastery_sum": 0,
            "time_sum": 0,
            "students": set(),
            "questions": set(),
        })
        section = by_section.setdefault(row.get("section_code"), {
            "section_code": row.get("section_code"),
            "section": row.get("section"),
            "attempted": 0,
            "solved": 0,
            "accuracy_sum": 0,
            "speed_sum": 0,
            "mastery_sum": 0,
            "time_sum": 0,
            "students": set(),
            "revision_due": 0,
        })
        student_bucket = by_student.setdefault(row["student_id"], {
            "student_id": row["student_id"],
            "attempted": 0,
            "solved": 0,
            "accuracy_sum": 0,
            "speed_sum": 0,
            "mastery_sum": 0,
            "time_sum": 0,
            "revision_due": 0,
            "weak_topics": [],
        })
        for bucket in (topic, section, student_bucket):
            bucket["attempted"] += 1 if row.get("attempted") else 0
            bucket["solved"] += 1 if row.get("solved") else 0
            bucket["accuracy_sum"] += row.get("accuracy", 0) or 0
            bucket["speed_sum"] += row.get("speed", 0) or 0
            bucket["mastery_sum"] += row.get("mastery_score", 0) or 0
            bucket["time_sum"] += row.get("average_time", 0) or 0
        topic["students"].add(row["student_id"])
        topic["questions"].add(row["question_id"])
        topic["difficulty_mix"][question.get("difficulty", row.get("difficulty"))] = topic["difficulty_mix"].get(question.get("difficulty", row.get("difficulty")), 0) + 1
        section["students"].add(row["student_id"])
        if row.get("revision_due"):
            section["revision_due"] += 1
            student_bucket["revision_due"] += 1
        if row.get("mastery_score", 0) < 60:
            student_bucket["weak_topics"].append(row.get("topic"))

    def finish(bucket: dict) -> dict:
        attempted = max(1, bucket.get("attempted", 0))
        return {
            **{k: v for k, v in bucket.items() if not isinstance(v, set) and not k.endswith("_sum")},
            "accuracy": round(bucket.get("accuracy_sum", 0) / attempted, 1),
            "speed": round(bucket.get("speed_sum", 0) / attempted, 1),
            "average_time": round(bucket.get("time_sum", 0) / attempted, 1),
            "mastery_score": round(bucket.get("mastery_sum", 0) / attempted, 1),
            "solve_rate": _pct(bucket.get("solved", 0), attempted, 1),
            "students": len(bucket.get("students", [])) if isinstance(bucket.get("students"), set) else bucket.get("students"),
        }

    topic_rows = [finish(row) for row in by_topic.values()]
    section_rows = [finish(row) for row in by_section.values()]
    student_rows = []
    for row in by_student.values():
        student = smap.get(row["student_id"], {})
        finished = finish(row)
        finished.update({
            "student_name": student.get("name", "-"),
            "roll_number": student.get("roll_number", "-"),
            "department": student.get("department", "-"),
            "weak_topics": sorted(set(row.get("weak_topics", [])))[:5],
        })
        student_rows.append(finished)
    topic_rows.sort(key=lambda row: (row["mastery_score"], row["accuracy"], -row["average_time"]))
    student_rows.sort(key=lambda row: (row["mastery_score"], row["accuracy"], -row["revision_due"]))
    attempted_total = sum(row.get("attempted", 0) for row in section_rows)
    solved_total = sum(row.get("solved", 0) for row in section_rows)
    avg_mastery = round(sum(row.get("mastery_score", 0) for row in section_rows) / max(1, len(section_rows)), 1)
    avg_accuracy = round(sum(row.get("accuracy", 0) for row in section_rows) / max(1, len(section_rows)), 1)
    avg_speed = round(sum(row.get("speed", 0) for row in section_rows) / max(1, len(section_rows)), 1)
    return {
        "catalog_total": len(questions),
        "summary": {
            "students": len(student_rows),
            "attempted": attempted_total,
            "solved": solved_total,
            "solve_rate": _pct(solved_total, max(1, attempted_total), 1),
            "avg_mastery": avg_mastery,
            "avg_accuracy": avg_accuracy,
            "avg_speed": avg_speed,
            "revision_due": sum(row.get("revision_due", 0) for row in section_rows),
            "health": _health((avg_mastery * 0.55) + (avg_accuracy * 0.30) + (avg_speed * 0.15)),
        },
        "sections": sorted(section_rows, key=lambda row: row["mastery_score"]),
        "topics": topic_rows,
        "weak_topics": topic_rows[:8],
        "speed_analysis": sorted(topic_rows, key=lambda row: row["speed"])[:8],
        "accuracy_analysis": sorted(topic_rows, key=lambda row: row["accuracy"])[:8],
        "priority_students": student_rows[:15],
        "scope": f"department:{scoped_department}" if scoped_department else "institution",
    }


@app.get("/api/aptitude/questions")
async def aptitude_questions(user=Depends(get_session_user)):
    await _ensure_aptitude_catalog()
    questions = await db.aptitude_questions.find({}, {"_id": 0}).sort("global_order", 1).to_list(1000)
    return {"questions": questions, "sections": APTITUDE_SECTIONS, "total": len(questions)}


@app.get("/api/me/aptitude/questions")
async def my_aptitude_questions(user=Depends(require_roles("student"))):
    _sid, student = await _resolve_student_for_user(user)
    if not student:
        raise HTTPException(404, "no student record bound")
    await _ensure_student_aptitude_progress(student)
    questions = await db.aptitude_questions.find({}, {"_id": 0}).sort("global_order", 1).to_list(1000)
    progress = await db.aptitude_question_progress.find({"student_id": student["student_id"]}, {"_id": 0}).to_list(1000)
    by_question = {row["question_id"]: row for row in progress}
    merged = [{**question, **by_question.get(question["question_id"], {})} for question in questions]
    return {
        "student_id": student["student_id"],
        "sections": APTITUDE_SECTIONS,
        "total": len(questions),
        "attempted": sum(1 for row in merged if row.get("attempted")),
        "solved": sum(1 for row in merged if row.get("solved")),
        "revision_due": sum(1 for row in merged if row.get("revision_due")),
        "questions": merged,
    }


@app.patch("/api/me/aptitude/questions/{question_id}")
async def update_my_aptitude_question(question_id: str, body: dict, request: Request, user=Depends(require_roles("student"))):
    _sid, student = await _resolve_student_for_user(user)
    if not student:
        raise HTTPException(404, "no student record bound")
    await _ensure_student_aptitude_progress(student)
    question = await db.aptitude_questions.find_one({"question_id": question_id}, {"_id": 0})
    if not question:
        raise HTTPException(404, "question not found")
    existing = await db.aptitude_question_progress.find_one({"student_id": student["student_id"], "question_id": question_id}, {"_id": 0}) or {}
    solved = bool(body.get("solved", existing.get("solved", False)))
    attempted = bool(body.get("attempted", existing.get("attempted", False)) or solved)
    accuracy = _clamp_score(body.get("accuracy", existing.get("accuracy", 85 if solved else 45)))
    average_time = max(1, float(body.get("average_time", existing.get("average_time", question.get("expected_time_sec", 75)))))
    speed = _clamp_score(body.get("speed", 100 - max(0, average_time - question.get("expected_time_sec", 75)) * 0.9))
    mastery = _clamp_score(body.get("mastery_score", (accuracy * 0.45) + (speed * 0.35) + (20 if solved else 0)))
    now = datetime.now(timezone.utc).isoformat()
    update = {
        "progress_id": existing.get("progress_id") or f"aptp_{uuid.uuid4().hex[:10]}",
        "student_id": student["student_id"],
        "institution_id": student["institution_id"],
        "question_id": question_id,
        "topic": question["topic"],
        "topic_code": question["topic_code"],
        "section": question["section"],
        "section_code": question["section_code"],
        "difficulty": question["difficulty"],
        "solved": solved,
        "attempted": attempted,
        "accuracy": round(accuracy, 1),
        "speed": round(speed, 1),
        "average_time": round(average_time, 1),
        "mastery_score": round(mastery, 1),
        "revision_due": bool(body.get("revision_due", mastery < 72)),
        "last_attempted": now,
        "updated_at": now,
    }
    await db.aptitude_question_progress.update_one(
        {"student_id": student["student_id"], "question_id": question_id},
        {"$set": update},
        upsert=True,
    )
    await _audit_log(
        "aptitude.question_progress_updated",
        user=user,
        institution_id=student["institution_id"],
        resource="aptitude_question",
        resource_id=question_id,
        metadata={"solved": solved, "mastery_score": update["mastery_score"]},
        request=request,
    )
    return {"question": {**question, **update}}


@app.get("/api/aptitude/question-analytics")
async def aptitude_question_analytics(department: Optional[str] = None, user=Depends(require_roles("super_admin", "institution_admin", "tpo", "faculty"))):
    return await _aptitude_question_analytics(user, department=department)


@app.get("/api/aptitude/intelligence")
async def aptitude_intelligence(department: Optional[str] = None, user=Depends(get_session_user)):
    iid = user.get("institution_id")
    if not iid:
        return {"by_section": [], "summary": {"overall_score": 0, "overall_accuracy": 0}}
    _iid, scoped_department, students = await _student_scope_for_user(user, department=department)
    sids = [student["student_id"] for student in students]
    match: dict[str, Any] = {"institution_id": iid}
    if user.get("role") == "student":
        match["student_id"] = {"$in": sids}
    elif scoped_department:
        match["student_id"] = {"$in": sids}
    rows = await db.aptitude_scores.find(match, {"_id": 0}).to_list(5000)
    smap = {student["student_id"]: student for student in students}

    by_code: dict[str, list[dict]] = {}
    for row in rows:
        by_code.setdefault(row["section_code"], []).append(row)

    sections = []
    for section in APTITUDE_SECTIONS:
        section_rows = by_code.get(section["code"], [])
        avg_score = _avg_num(section_rows, "score_pct")
        avg_accuracy = _avg_num(section_rows, "accuracy_pct")
        avg_time = _avg_num(section_rows, "avg_time_sec")
        weakness_index = round(max(0, 75 - avg_score) + max(0, 72 - avg_accuracy) + max(0, avg_time - 75) * 0.35, 1)
        sections.append({
            "_id": section["code"],
            "section_code": section["code"],
            "section_name": section["name"],
            "avg_score": avg_score,
            "avg_accuracy": avg_accuracy,
            "avg_time_sec": avg_time,
            "tests": sum(row.get("tests_taken", 0) or 0 for row in section_rows),
            "students": len({row["student_id"] for row in section_rows}),
            "weakness_index": weakness_index,
            "health": _health((avg_score * 0.7) + (avg_accuracy * 0.3)),
        })

    weak_rows = sorted(
        [row for row in rows if (row.get("score_pct", 0) < 62 or row.get("accuracy_pct", 0) < 65 or row.get("avg_time_sec", 0) > 95)],
        key=lambda row: (row.get("score_pct", 0), row.get("accuracy_pct", 0)),
    )[:15]
    priority_students = []
    for row in weak_rows:
        student = smap.get(row["student_id"], {})
        priority_students.append({
            **row,
            "student_name": student.get("name", "-"),
            "roll_number": student.get("roll_number", "-"),
            "department": student.get("department", "-"),
            "reason": "Low score" if row.get("score_pct", 0) < 62 else "Speed or accuracy risk",
        })

    weak_sections = sorted(sections, key=lambda row: row["weakness_index"], reverse=True)[:3]
    overall_score = _avg_num(rows, "score_pct")
    overall_accuracy = _avg_num(rows, "accuracy_pct")
    question_analytics = await _aptitude_question_analytics(user, department=department) if user.get("role") in {"super_admin", "institution_admin", "tpo", "faculty"} else {}
    recommendations = [
        {
            "area": section["section_name"],
            "action": f"Run timed {section['section_name']} drills; current score {section['avg_score']}% and accuracy {section['avg_accuracy']}%.",
            "severity": "high" if section["weakness_index"] >= 25 else "medium",
        }
        for section in weak_sections
        if section["weakness_index"] > 0
    ]
    return {
        "by_section": sections,
        "sections": APTITUDE_SECTIONS,
        "summary": {
            "overall_score": overall_score,
            "overall_accuracy": overall_accuracy,
            "avg_time_sec": _avg_num(rows, "avg_time_sec"),
            "students": len(sids),
            "tests": sum(row.get("tests_taken", 0) or 0 for row in rows),
            "health": _health((overall_score * 0.7) + (overall_accuracy * 0.3)),
        },
        "weak_sections": weak_sections,
        "priority_students": priority_students,
        "question_analytics": question_analytics,
        "weak_topics": question_analytics.get("weak_topics", []),
        "speed_analysis": question_analytics.get("speed_analysis", []),
        "accuracy_analysis": question_analytics.get("accuracy_analysis", []),
        "recommendations": recommendations,
        "scope": f"department:{scoped_department}" if scoped_department else "institution",
    }


# ============== RESUME ATS ==============
@app.get("/api/ats/intelligence")
async def ats_intelligence(department: Optional[str] = None, user=Depends(get_session_user)):
    iid = user.get("institution_id")
    if not iid:
        return {"avg_score": 0, "rows": [], "summary": {"health": "critical"}}
    _iid, scoped_department, scoped_students = await _student_scope_for_user(user, department=department)
    await _ensure_resume_versions_for_students(scoped_students)
    scoped_sids = [student["student_id"] for student in scoped_students]
    query: dict[str, Any] = {"institution_id": iid}
    if user.get("role") == "student":
        query["student_id"] = {"$in": scoped_sids}
    elif scoped_department:
        query["student_id"] = {"$in": scoped_sids}
    pipeline = [{"$match": query},
                {"$group": {"_id": None, "avg": {"$avg": "$score"}, "count": {"$sum": 1}}}]
    agg = await db.ats_reports.aggregate(pipeline).to_list(1)
    rows = await db.ats_reports.find(query, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    version_query: dict[str, Any] = {"institution_id": iid}
    if scoped_sids:
        version_query["student_id"] = {"$in": scoped_sids}
    versions = await db.resume_versions.find(version_query, {"_id": 0}).sort("upload_date", -1).limit(250).to_list(250)
    sids = list({r["student_id"] for r in rows})
    students = await db.students.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(200)
    smap = {s["student_id"]: s for s in students}
    for r in rows:
        s = smap.get(r["student_id"], {})
        r["student_name"] = s.get("name", "—")
        r["roll_number"] = s.get("roll_number", "—")
        r["department"] = s.get("department", "—")
    for row in rows:
        row["risk_level"] = "high" if row.get("score", 0) < 60 else "medium" if row.get("score", 0) < 75 else "low"
    keyword_counts: dict[str, int] = {}
    for row in rows + versions:
        for keyword in row.get("missing_keywords", []):
            keyword_counts[keyword] = keyword_counts.get(keyword, 0) + 1
    keyword_heatmap = [
        {"keyword": keyword, "missing_count": count, "coverage_gap_pct": _pct(count, max(1, len(rows)), 1)}
        for keyword, count in sorted(keyword_counts.items(), key=lambda item: item[1], reverse=True)
    ]
    priority_students = sorted(
        [row for row in rows if row.get("score", 0) < 72 or row.get("keyword_match_pct", 0) < 65],
        key=lambda row: (row.get("score", 0), row.get("keyword_match_pct", 0)),
    )[:12]
    avg_score = round(agg[0]["avg"], 1) if agg else 0
    avg_keyword = _avg_num(rows, "keyword_match_pct")
    avg_format = _avg_num(rows, "format_score")
    latest_versions: dict[str, dict] = {}
    version_history: dict[str, list[dict]] = {}
    for version in sorted(versions, key=lambda row: (row.get("student_id"), row.get("version") or 0)):
        version_history.setdefault(version["student_id"], []).append(version)
        latest_versions[version["student_id"]] = version
    version_rows = []
    for sid, history in version_history.items():
        student = smap.get(sid, {})
        latest = history[-1]
        first = history[0]
        version_rows.append({
            "student_id": sid,
            "student_name": student.get("name", "-"),
            "roll_number": student.get("roll_number", "-"),
            "department": student.get("department", "-"),
            "versions": len(history),
            "latest_resume_id": latest.get("resume_id"),
            "latest_version": latest.get("version"),
            "ats_score": latest.get("ats_score", 0),
            "keyword_score": latest.get("keyword_score", 0),
            "recruiter_match_score": latest.get("recruiter_match_score", 0),
            "score_delta": round((latest.get("ats_score", 0) or 0) - (first.get("ats_score", 0) or 0), 1),
            "missing_keywords": latest.get("missing_keywords", []),
            "suggestions": latest.get("improvement_suggestions", []),
        })
    version_rows.sort(key=lambda row: (row["ats_score"], row["keyword_score"]))
    skill_gaps = [
        {
            "keyword": item["keyword"],
            "missing_count": item["missing_count"],
            "coverage_gap_pct": item["coverage_gap_pct"],
            "suggestion": f"Add quantified project or internship evidence for {item['keyword']}.",
        }
        for item in keyword_heatmap[:10]
    ]
    recruiter_compatibility = sorted(version_rows, key=lambda row: row["recruiter_match_score"], reverse=True)[:20]
    recommendations = []
    if keyword_heatmap:
        recommendations.append({
            "area": "keyword_heatmap",
            "action": f"Build resume clinics around {keyword_heatmap[0]['keyword']} and adjacent role keywords.",
            "severity": "high" if keyword_heatmap[0]["coverage_gap_pct"] >= 30 else "medium",
        })
    if priority_students:
        recommendations.append({
            "area": "low_ats",
            "action": f"Prioritize {len(priority_students)} low ATS resumes for targeted rewrite.",
            "severity": "high",
        })
    return {
        "avg_score": avg_score,
        "count": agg[0]["count"] if agg else 0,
        "rows": rows[:40],
        "summary": {
            "avg_score": avg_score,
            "avg_keyword_match": avg_keyword,
            "avg_format_score": avg_format,
            "low_score_count": len([row for row in rows if row.get("score", 0) < 65]),
            "format_risk_count": len([row for row in rows if row.get("format_score", 0) < 70]),
            "health": _health((avg_score * 0.65) + (avg_keyword * 0.25) + (avg_format * 0.10)),
        },
        "keyword_heatmap": keyword_heatmap[:12],
        "skill_gaps": skill_gaps,
        "resume_versions": versions[:80],
        "version_history": version_rows[:40],
        "recruiter_compatibility": recruiter_compatibility,
        "priority_students": priority_students,
        "recommendations": recommendations,
        "scope": f"department:{scoped_department}" if scoped_department else "institution",
    }


@app.get("/api/ats/resume-versions")
async def ats_resume_versions(user=Depends(get_session_user)):
    _iid, _dept, students = await _student_scope_for_user(user)
    await _ensure_resume_versions_for_students(students)
    sids = [student["student_id"] for student in students]
    query: dict[str, Any] = {"student_id": {"$in": sids}} if sids else {"student_id": "__none__"}
    versions = await db.resume_versions.find(query, {"_id": 0}).sort("upload_date", -1).to_list(500)
    return {"items": versions, "count": len(versions)}


@app.get("/api/ats/heatmap")
async def ats_heatmap(user=Depends(get_session_user)):
    data = await ats_intelligence(user=user)
    return {
        "keyword_heatmap": data.get("keyword_heatmap", []),
        "skill_gaps": data.get("skill_gaps", []),
        "recruiter_compatibility": data.get("recruiter_compatibility", []),
        "scope": data.get("scope"),
    }


# ============== INTERVIEW REPORTS ==============
@app.get("/api/interviews/intelligence")
async def interviews_intelligence(department: Optional[str] = None, user=Depends(get_session_user)):
    iid = user.get("institution_id")
    if not iid:
        return {"rows": [], "summary": {"health": "critical"}}
    _iid, scoped_department, scoped_students = await _student_scope_for_user(user, department=department)
    scoped_sids = [student["student_id"] for student in scoped_students]
    query: dict[str, Any] = {"institution_id": iid}
    if user.get("role") == "student":
        query["student_id"] = {"$in": scoped_sids}
    elif scoped_department:
        query["student_id"] = {"$in": scoped_sids}
    rows = await db.interview_reports.find(query, {"_id": 0}).sort("conducted_at", -1).limit(120).to_list(120)
    sids = list({r["student_id"] for r in rows})
    students = await db.students.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(120)
    smap = {s["student_id"]: s for s in students}
    for r in rows:
        s = smap.get(r["student_id"], {})
        r["student_name"] = s.get("name", "—")
        r["roll_number"] = s.get("roll_number", "—")
    avg_conf = round(sum(r["confidence_score"] for r in rows) / max(1, len(rows)), 1)
    avg_tech = round(sum(r["technical_score"] for r in rows) / max(1, len(rows)), 1)
    for row in rows:
        student = smap.get(row["student_id"], {})
        row["department"] = student.get("department", row.get("department", "-"))
    rubric_avgs = {
        "confidence": avg_conf,
        "communication": _avg_num(rows, "communication_score"),
        "technical": avg_tech,
        "body_language": _avg_num(rows, "body_language_score"),
        "overall": _avg_num(rows, "overall_score"),
    }
    by_type_map: dict[str, list[dict]] = {}
    for row in rows:
        by_type_map.setdefault(row.get("type", "Mock"), []).append(row)
    by_type = [
        {
            "type": interview_type,
            "count": len(type_rows),
            "avg_overall": _avg_num(type_rows, "overall_score"),
            "avg_technical": _avg_num(type_rows, "technical_score"),
            "avg_communication": _avg_num(type_rows, "communication_score"),
        }
        for interview_type, type_rows in sorted(by_type_map.items())
    ]
    weak_rubrics = [
        {"rubric": key, "score": value, "gap_to_benchmark": round(max(0, 75 - value), 1)}
        for key, value in rubric_avgs.items()
        if key != "overall" and value < 75
    ]
    weak_rubrics.sort(key=lambda row: row["gap_to_benchmark"], reverse=True)
    priority_students = sorted(
        [row for row in rows if row.get("overall_score", 0) < 68 or row.get("technical_score", 0) < 62],
        key=lambda row: (row.get("overall_score", 0), row.get("technical_score", 0)),
    )[:12]
    recommendations = [
        {
            "area": row["rubric"],
            "action": f"Run focused mock interviews for {row['rubric'].replace('_', ' ')}; benchmark gap is {row['gap_to_benchmark']}.",
            "severity": "high" if row["gap_to_benchmark"] >= 15 else "medium",
        }
        for row in weak_rubrics[:3]
    ]
    return {
        "rows": rows[:60],
        "avg_confidence": avg_conf,
        "avg_technical": avg_tech,
        "summary": {
            "reports": len(rows),
            "avg_overall": rubric_avgs["overall"],
            "weak_student_count": len(priority_students),
            "health": _health(rubric_avgs["overall"]),
        },
        "rubric_avgs": rubric_avgs,
        "weak_rubrics": weak_rubrics,
        "by_type": by_type,
        "priority_students": priority_students,
        "recommendations": recommendations,
        "scope": f"department:{scoped_department}" if scoped_department else "institution",
    }


@app.get("/api/interviews/history")
async def interviews_history(user=Depends(get_session_user)):
    _iid, scoped_department, students = await _student_scope_for_user(user)
    sids = [student["student_id"] for student in students]
    smap = {student["student_id"]: student for student in students}
    query: dict[str, Any] = {"student_id": {"$in": sids}} if sids else {"student_id": "__none__"}
    rows = await db.interview_reports.find(query, {"_id": 0}).sort("conducted_at", 1).to_list(1000)
    by_student: dict[str, list[dict]] = {}
    for row in rows:
        by_student.setdefault(row["student_id"], []).append(row)

    timelines = []
    for sid, history in by_student.items():
        student = smap.get(sid, {})
        first = history[0]
        latest = history[-1]
        rubric_latest = {
            "communication": latest.get("communication_score", 0),
            "confidence": latest.get("confidence_score", 0),
            "technical": latest.get("technical_score", 0),
            "hr": latest.get("hr_score", latest.get("body_language_score", 0)),
            "overall": latest.get("overall_score", 0),
        }
        weak_areas = [
            {"area": area, "score": score, "gap": round(max(0, 75 - (score or 0)), 1)}
            for area, score in rubric_latest.items()
            if area != "overall" and (score or 0) < 75
        ]
        weak_areas.sort(key=lambda row: row["gap"], reverse=True)
        timelines.append({
            "student_id": sid,
            "student_name": student.get("name", "-"),
            "roll_number": student.get("roll_number", "-"),
            "department": student.get("department", "-"),
            "interviews": len(history),
            "first_score": first.get("overall_score", 0),
            "latest_score": latest.get("overall_score", 0),
            "improvement": round((latest.get("overall_score", 0) or 0) - (first.get("overall_score", 0) or 0), 1),
            "interview_readiness": _health(latest.get("overall_score", 0) or 0),
            "weak_areas": weak_areas[:4],
            "latest_feedback": latest.get("feedback"),
            "history": history[-6:],
        })
    timelines.sort(key=lambda row: (row["latest_score"], -row["interviews"]))
    return {
        "items": timelines,
        "weak_area_detection": timelines[:15],
        "improvement_tracking": sorted(timelines, key=lambda row: row["improvement"])[:15],
        "student_timeline": timelines[0]["history"] if user.get("role") == "student" and timelines else [],
        "scope": f"department:{scoped_department}" if scoped_department else "institution",
    }


# ============== PLACEMENT INTELLIGENCE ==============
@app.get("/api/placements/overview")
async def placements_overview(user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    if user["role"] == "super_admin":
        iid = "inst_kmit"
    years = await db.year_summaries.find({"institution_id": iid}, {"_id": 0}).sort("academic_year", -1).to_list(20)
    records = await db.placement_records.find({"institution_id": iid}, {"_id": 0}).to_list(500)
    placed = await db.students.count_documents({"institution_id": iid, "placement.placed": True})
    total = await db.students.count_documents({"institution_id": iid})
    pipeline = [{"$match": {"institution_id": iid}},
                {"$group": {"_id": "$company", "selects": {"$sum": "$selects"}, "max_ctc": {"$max": "$ctc_lpa"}}},
                {"$sort": {"selects": -1}}, {"$limit": 12}]
    top = await db.placement_records.aggregate(pipeline).to_list(20)
    top = [{"company": r["_id"], "selects": r["selects"], "max_ctc": r["max_ctc"]} for r in top]
    inst = await db.institutions.find_one({"institution_id": iid}, {"_id": 0})
    dept_breakdown = []
    for d in (inst["departments"] if inst else []):
        p = await db.students.count_documents({"institution_id": iid, "department": d, "placement.placed": True})
        t = await db.students.count_documents({"institution_id": iid, "department": d})
        dept_breakdown.append({"department": d, "placed": p, "total": t, "placement_rate": _pct(p, t)})
    readiness = await build_readiness_roster(db, institution_id=iid, limit=1000)
    latest = years[0] if years else {}
    previous = years[1] if len(years) > 1 else {}
    active_jobs = await db.jobs.find({"institutions": {"$in": [iid]}, "status": "open"}, {"_id": 0}).to_list(200)
    open_capacity = sum(job.get("openings", 0) or 0 for job in active_jobs)
    interview_count = await db.applications.count_documents({"institution_id": iid, "stage": "Interview"})
    historical_conversion = _pct(latest.get("offers", 0), max(1, total), 3) / 100
    forecasted_offers = int(round((latest.get("offers", placed) or placed) + (open_capacity * max(0.08, historical_conversion * 0.22)) + (interview_count * 0.28)))
    risk_departments = sorted(
        [
            {
                **dept,
                "readiness_gap": max(0, 72 - readiness["avg_readiness"]),
                "placement_gap": max(0, 70 - dept.get("placement_rate", 0)),
            }
            for dept in dept_breakdown
            if dept.get("placement_rate", 0) < 70
        ],
        key=lambda row: row["placement_rate"],
    )
    return {
        "year_summaries": years, "records": records, "top_recruiters": top,
        "department_breakdown": dept_breakdown,
        "students_placed": placed, "students_total": total,
        "forecast": {
            "latest_year": latest.get("academic_year"),
            "current_offers": latest.get("offers", placed),
            "previous_offers": previous.get("offers", 0),
            "gap_to_previous": (latest.get("offers", 0) or 0) - (previous.get("offers", 0) or 0),
            "open_drive_capacity": open_capacity,
            "interview_stage_count": interview_count,
            "forecasted_offers": forecasted_offers,
            "confidence": "medium" if active_jobs else "low",
        },
        "risk_departments": risk_departments[:5],
        "recommendations": [
            {
                "area": "department_health",
                "action": f"Intervene in {risk_departments[0]['department']} placement readiness first.",
                "severity": "high",
            }
        ] if risk_departments else [],
        "readiness": {
            "avg_readiness": readiness["avg_readiness"],
            "placement_ready": readiness["placement_ready"],
            "needs_intervention": readiness["needs_intervention"],
            "by_band": readiness["by_band"],
            "component_avgs": readiness["component_avgs"],
            "weak_students": readiness["weak_students"],
        },
    }


@app.get("/api/placements/intelligence")
async def placement_intelligence(department: Optional[str] = None, user=Depends(require_roles("super_admin", "institution_admin", "tpo", "faculty"))):
    analytics = await _analytics_engine_payload(user, department=department)
    iid = analytics["scope"]["institution_id"]
    scoped_department = analytics["scope"].get("department")
    readiness = await _batch_readiness_summary(iid, department=scoped_department, limit=1500)
    risk_students = sorted(
        [
            row for row in readiness.get("weak_students", [])
            if row.get("readiness_score", 0) < 68 or not row.get("placement", {}).get("placed")
        ],
        key=lambda row: row.get("readiness_score", 0),
    )[:20]
    app_query: dict[str, Any] = {"institution_id": iid}
    if scoped_department:
        app_query["department"] = scoped_department
    applications = await db.applications.find(app_query, {"_id": 0}).to_list(5000)
    recruiter_map: dict[str, dict[str, Any]] = {}
    for application in applications:
        company = application.get("company") or "Unknown"
        row = recruiter_map.setdefault(company, {"company": company, "applications": 0, "selected": 0, "interviews": 0, "rejected": 0})
        row["applications"] += 1
        if application.get("stage") == "Selected":
            row["selected"] += 1
        elif application.get("stage") == "Interview":
            row["interviews"] += 1
        elif application.get("stage") == "Rejected":
            row["rejected"] += 1
    recruiter_conversions = []
    for row in recruiter_map.values():
        row["conversion_rate"] = _pct(row["selected"], max(1, row["applications"]), 1)
        row["interview_rate"] = _pct(row["interviews"], max(1, row["applications"]), 1)
        recruiter_conversions.append(row)
    recruiter_conversions.sort(key=lambda row: (row["conversion_rate"], row["applications"]), reverse=True)
    readiness_trends = [
        {
            "band": band,
            "students": count,
            "share": _pct(count, max(1, len(readiness.get("rows", []))), 1),
        }
        for band, count in readiness.get("by_band", {}).items()
    ]
    return {
        "scope": analytics["scope"],
        "forecast": analytics["forecast"],
        "placement_funnel": analytics["funnel"],
        "department_analytics": analytics["department_health"],
        "institution_analytics": analytics["summary"],
        "risk_students": risk_students,
        "recruiter_conversions": recruiter_conversions[:20],
        "readiness_trends": readiness_trends,
        "recommendations": analytics["recommendations"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


# ============== TRAINING ==============
@app.get("/api/cohorts")
async def list_cohorts(user=Depends(get_session_user)):
    iid = user.get("institution_id")
    query = {} if user["role"] == "super_admin" else {"institution_id": iid}
    items = await db.training_programs.find(query, {"_id": 0}).to_list(200)
    return {"items": items, "programs": PROGRAMS}


@app.get("/api/training/completion")
async def training_completion(user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    pipeline = [{"$match": {"institution_id": iid}},
                {"$group": {"_id": "$program_code",
                            "avg_completion": {"$avg": "$completion_pct"},
                            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                            "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}},
                            "enrolled": {"$sum": 1}}}]
    by_program = await db.enrollments.aggregate(pipeline).to_list(20)
    prog_map = {p["code"]: p for p in PROGRAMS}
    for r in by_program:
        meta = prog_map.get(r["_id"], {})
        r["program_code"] = r["_id"]; r["program_name"] = meta.get("name", r["_id"])
        r["modules"] = meta.get("modules"); r["avg_completion"] = round(r["avg_completion"] or 0, 1)
    enroll_rows = await db.enrollments.find({"institution_id": iid}, {"_id": 0}).sort("completion_pct", -1).limit(80).to_list(80)
    sids = list({e["student_id"] for e in enroll_rows})
    students = await db.students.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(200)
    smap = {s["student_id"]: s for s in students}
    for e in enroll_rows:
        s = smap.get(e["student_id"], {})
        e["student_name"] = s.get("name", "—")
        e["roll_number"] = s.get("roll_number", "—")
        e["department"] = s.get("department", "—")
    for row in enroll_rows:
        row["risk_level"] = "high" if row.get("completion_pct", 0) < 45 else "medium" if row.get("completion_pct", 0) < 65 else "low"
    weak_programs = sorted(
        [
            {
                **program,
                "completion_gap": round(max(0, 75 - (program.get("avg_completion", 0) or 0)), 1),
                "health": _health(program.get("avg_completion", 0) or 0),
            }
            for program in by_program
        ],
        key=lambda row: row["avg_completion"],
    )
    priority_students = sorted(
        [row for row in enroll_rows if row.get("completion_pct", 0) < 60],
        key=lambda row: row.get("completion_pct", 0),
    )[:12]
    avg_completion = round(
        sum(program.get("avg_completion", 0) or 0 for program in by_program) / max(1, len(by_program)),
        1,
    )
    return {
        "by_program": by_program,
        "rows": enroll_rows,
        "summary": {
            "avg_completion": avg_completion,
            "programs": len(by_program),
            "enrollments": sum(program.get("enrolled", 0) or 0 for program in by_program),
            "low_completion_count": len(priority_students),
            "health": _health(avg_completion),
        },
        "weak_programs": weak_programs[:5],
        "priority_students": priority_students,
        "recommendations": [
            {
                "area": "training_completion",
                "action": f"Move {len(priority_students)} low-completion learners into faculty follow-up.",
                "severity": "high" if len(priority_students) >= 8 else "medium",
            }
        ] if priority_students else [],
    }


# ============== CROSS-MODULE INTELLIGENCE ==============
@app.get("/api/intelligence/modules")
async def module_intelligence(user=Depends(require_roles("super_admin", "institution_admin", "tpo", "faculty"))):
    role = user.get("role")
    iid = user.get("institution_id") or "inst_kmit"
    if role == "super_admin":
        iid = "inst_kmit"
    scoped_department = user.get("department") if role == "faculty" and user.get("department") else None
    operating = await _institution_operating_data(
        iid,
        department=scoped_department,
        readiness_limit=1500,
        fast_readiness=True,
    )
    readiness = operating["readiness"]

    student_query: dict[str, Any] = {"institution_id": iid}
    if scoped_department:
        student_query["department"] = scoped_department
    scoped_students = await db.students.find(student_query, {"_id": 0, "student_id": 1}).to_list(1500)
    scoped_sids = [student["student_id"] for student in scoped_students]
    dsa_match: dict[str, Any] = {"institution_id": iid, "topic_code": {"$in": DSA_TOPIC_CODES}}
    if scoped_department:
        dsa_match["student_id"] = {"$in": scoped_sids}
    dsa_rows = await db.dsa_progress.find(dsa_match, {"_id": 0}).to_list(20000)
    aptitude = await aptitude_intelligence(user=user)
    ats = await ats_intelligence(user=user)
    interviews = await interviews_intelligence(user=user)
    training = await training_completion(user=user)

    dsa_score = 0
    if dsa_rows:
        by_topic: dict[str, dict[str, int]] = {}
        for row in dsa_rows:
            bucket = by_topic.setdefault(row["topic_code"], {"solved": 0, "total": 0, "students": 0})
            bucket["solved"] += row.get("solved", 0) or 0
            bucket["total"] += row.get("total", 0) or 0
            bucket["students"] += 1
        topic_scores = [
            (row["solved"] / max(1, row["total"])) * 100
            for row in by_topic.values()
        ]
        dsa_score = round(sum(topic_scores) / max(1, len(topic_scores)), 1)
    dsa_leaders = len([row for row in dsa_rows if (row.get("solved", 0) or 0) >= 30])

    cards = [
        {
            "module": "Placement Intelligence",
            "code": "placements",
            "score": readiness["avg_readiness"],
            "health": _health(readiness["avg_readiness"]),
            "primary": f"{operating['students_placed']}/{operating['students_total']} placed",
            "risk": f"{readiness['needs_intervention']} readiness interventions",
            "action": _module_action("placements", readiness["avg_readiness"]),
            "to": "/tpo/outcomes" if user.get("role") == "tpo" else "/institution/departments",
        },
        {
            "module": "DSA Intelligence",
            "code": "dsa",
            "score": dsa_score,
            "health": _health(dsa_score),
            "primary": f"{DSA_TOTAL} A2Z questions",
            "risk": f"{dsa_leaders} leaders tracked",
            "action": _module_action("dsa", dsa_score),
            "to": "/faculty/dsa" if user.get("role") == "faculty" else "/tpo/dsa",
        },
        {
            "module": "Aptitude Intelligence",
            "code": "aptitude",
            "score": aptitude["summary"]["overall_score"],
            "health": aptitude["summary"]["health"],
            "primary": f"{aptitude['summary']['tests']} tests",
            "risk": f"{len(aptitude.get('priority_students', []))} weak rows",
            "action": _module_action("aptitude", aptitude["summary"]["overall_score"]),
            "to": "/faculty/aptitude" if user.get("role") == "faculty" else "/tpo/aptitude",
        },
        {
            "module": "Resume ATS",
            "code": "ats",
            "score": ats["summary"]["avg_score"],
            "health": ats["summary"]["health"],
            "primary": f"{ats['count']} resumes",
            "risk": f"{ats['summary']['low_score_count']} low ATS",
            "action": _module_action("ats", ats["summary"]["avg_score"]),
            "to": "/tpo/ats",
        },
        {
            "module": "Interview Intelligence",
            "code": "interviews",
            "score": interviews["summary"]["avg_overall"],
            "health": interviews["summary"]["health"],
            "primary": f"{interviews['summary']['reports']} reports",
            "risk": f"{interviews['summary']['weak_student_count']} remediation rows",
            "action": _module_action("interviews", interviews["summary"]["avg_overall"]),
            "to": "/faculty/interviews" if user.get("role") == "faculty" else "/tpo/interviews",
        },
        {
            "module": "Training Intelligence",
            "code": "training",
            "score": training["summary"]["avg_completion"],
            "health": training["summary"]["health"],
            "primary": f"{training['summary']['programs']} programs",
            "risk": f"{training['summary']['low_completion_count']} low completion",
            "action": _module_action("training", training["summary"]["avg_completion"]),
            "to": "/faculty/training" if user.get("role") == "faculty" else "/tpo/training",
        },
    ]
    critical_alerts = [
        {
            "module": card["module"],
            "risk": card["risk"],
            "action": card["action"],
            "to": card["to"],
        }
        for card in cards
        if card["health"] in {"critical", "watch"}
    ][:6]
    return {
        "scope": f"department:{scoped_department}" if scoped_department else "institution",
        "cards": cards,
        "critical_alerts": critical_alerts,
        "recommendations": (
            [{
                "area": "placement_readiness",
                "action": f"Move {readiness.get('needs_intervention', 0)} readiness interventions into owned cohorts.",
                "severity": "high" if readiness.get("needs_intervention", 0) else "medium",
            }]
            + aptitude.get("recommendations", [])
            + ats.get("recommendations", [])
            + interviews.get("recommendations", [])
            + training.get("recommendations", [])
        )[:10],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


def _delta_pct(current: float, previous: float) -> float:
    if not previous:
        return 0
    return round(((current - previous) / previous) * 100, 1)


def _funnel_action(stage: str, leakage: float) -> str:
    if stage == "Applied":
        return "Tighten eligibility screening and publish clearer role-fit criteria."
    if stage == "Shortlisted":
        return "Move shortlist rows into assessment or interview slots within 48 hours."
    if stage == "Assessment":
        return "Add aptitude and coding prep boosters for assessment-stage drop-off."
    if stage == "Interview":
        return "Run recruiter-specific mock interviews and interviewer calibration."
    if stage == "Selected":
        return "Convert selected rows into offer records and package intelligence."
    if leakage >= 35:
        return "Open a review with TPO, faculty owner, and recruiter owner."
    return "Monitor stage movement and remove aging rows."


async def _analytics_engine_payload(user: dict, department: Optional[str] = None) -> dict:
    role = user.get("role")
    iid = user.get("institution_id") or "inst_kmit"
    if role == "super_admin":
        iid = "inst_kmit"
    scoped_department = user.get("department") if role == "faculty" and user.get("department") else department

    operating = await _institution_operating_data(
        iid,
        department=scoped_department,
        readiness_limit=1500,
        fast_readiness=True,
    )
    readiness = operating["readiness"]
    years = operating["year_summaries"]
    latest = years[0] if years else {}
    previous = years[1] if len(years) > 1 else {}
    training = await training_completion(user=user)

    placement_score = operating["placement_rate"]
    readiness_score = readiness.get("avg_readiness", 0)
    training_score = training["summary"]["avg_completion"]
    funnel = operating["pipeline"]
    active_pipeline = funnel.get("Applied", 0) + funnel.get("Shortlisted", 0) + funnel.get("Assessment", 0) + funnel.get("Interview", 0)
    conversion = _pct(funnel.get("Selected", 0), max(1, sum(funnel.values())), 1)
    command_score = round((placement_score * 0.28) + (readiness_score * 0.34) + (training_score * 0.20) + (conversion * 0.18), 1)

    stage_order = ["Applied", "Shortlisted", "Assessment", "Interview", "Selected", "Rejected"]
    funnel_rows = []
    prior_count = None
    for stage in stage_order:
        count = funnel.get(stage, 0)
        leakage = 0 if prior_count in (None, 0) else round(max(0, 1 - (count / prior_count)) * 100, 1)
        funnel_rows.append({
            "stage": stage,
            "count": count,
            "share": _pct(count, max(1, sum(funnel.values())), 1),
            "conversion_from_previous": 100 if prior_count in (None, 0) else round(min(100, (count / prior_count) * 100), 1),
            "leakage": leakage,
            "action": _funnel_action(stage, leakage),
        })
        if stage != "Rejected":
            prior_count = count

    department_health = []
    for dept in operating["department_breakdown"]:
        dept_readiness = await _batch_readiness_summary(iid, department=dept["department"], limit=500)
        placed_rate = dept.get("placement_rate", 0)
        ready_avg = dept_readiness.get("avg_readiness", 0)
        health_score = round((placed_rate * 0.45) + (ready_avg * 0.45) + (training_score * 0.10), 1)
        department_health.append({
            "department": dept["department"],
            "placement_rate": placed_rate,
            "placed": dept.get("placed", 0),
            "total": dept.get("total", 0),
            "readiness_avg": ready_avg,
            "ready_students": dept_readiness.get("placement_ready", 0),
            "interventions": dept_readiness.get("needs_intervention", 0),
            "health_score": health_score,
            "health": _health(health_score),
        })
    department_health.sort(key=lambda row: row["health_score"])

    trend = []
    for index, year in enumerate(reversed(years)):
        prior = list(reversed(years))[index - 1] if index else {}
        trend.append({
            "academic_year": year.get("academic_year"),
            "offers": year.get("offers", 0),
            "companies": year.get("companies", 0),
            "avg_lpa": year.get("avg_lpa", 0),
            "top_offer_lpa": year.get("top_offer_lpa", 0),
            "offer_delta_pct": _delta_pct(year.get("offers", 0), prior.get("offers", 0)),
            "company_delta_pct": _delta_pct(year.get("companies", 0), prior.get("companies", 0)),
        })

    risk_register = []
    if readiness.get("needs_intervention", 0):
        risk_register.append({
            "risk": "Readiness intervention load",
            "severity": "high" if readiness.get("needs_intervention", 0) >= 40 else "medium",
            "signal": f"{readiness.get('needs_intervention', 0)} students need intervention",
            "owner": "Faculty + TPO",
            "action": "Assign cohort owners to the lowest readiness band this week.",
        })
    for dept in department_health[:3]:
        if dept["health"] in {"critical", "watch"}:
            risk_register.append({
                "risk": f"{dept['department']} department health",
                "severity": "high" if dept["health"] == "critical" else "medium",
                "signal": f"{dept['placement_rate']}% placed, {dept['readiness_avg']}/100 readiness",
                "owner": "Department faculty",
                "action": "Run department-specific placement clinic and recruiter matching.",
            })
    worst_funnel = max(funnel_rows[:-1], key=lambda row: row["leakage"], default=None)
    if worst_funnel and worst_funnel["leakage"] >= 25:
        risk_register.append({
            "risk": "Application funnel leakage",
            "severity": "high" if worst_funnel["leakage"] >= 45 else "medium",
            "signal": f"{worst_funnel['leakage']}% leakage around {worst_funnel['stage']}",
            "owner": "TPO operations",
            "action": worst_funnel["action"],
        })

    open_capacity = sum(job.get("openings", 0) or 0 for job in operating["open_jobs"])
    forecast_offers = int(round((latest.get("offers", 0) or operating["students_placed"]) + open_capacity * 0.12 + funnel.get("Interview", 0) * 0.3))
    forecast_confidence = "high" if active_pipeline >= 75 and open_capacity >= 50 else "medium" if active_pipeline >= 30 else "low"
    recommendations = [
        {
            "title": "Protect the conversion path",
            "body": worst_funnel["action"] if worst_funnel else "Keep weekly stage aging reviews in place.",
            "priority": "high" if worst_funnel and worst_funnel["leakage"] >= 35 else "medium",
            "to": "/tpo/applications" if role == "tpo" else "/institution/departments",
        },
        {
            "title": "Move low-readiness students into owned cohorts",
            "body": f"{readiness.get('needs_intervention', 0)} learners need a named faculty intervention owner.",
            "priority": "high" if readiness.get("needs_intervention", 0) >= 40 else "medium",
            "to": "/tpo/roster" if role == "tpo" else "/faculty/roster",
        },
        {
            "title": "Prepare board packet",
            "body": "Export the leadership packet after reviewing forecast confidence and department health.",
            "priority": "medium",
            "to": "/tpo/reports" if role == "tpo" else "/institution/reports",
        },
    ]

    return {
        "scope": {
            "institution_id": iid,
            "institution": operating["institution"].get("short_name") or operating["institution"].get("name"),
            "department": scoped_department,
            "role": role,
        },
        "summary": {
            "command_score": command_score,
            "health": _health(command_score),
            "placement_rate": placement_score,
            "readiness_avg": readiness_score,
            "training_avg": training_score,
            "conversion_rate": conversion,
            "active_pipeline": active_pipeline,
            "offers_latest": latest.get("offers", 0),
            "offers_delta_pct": _delta_pct(latest.get("offers", 0), previous.get("offers", 0)),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        },
        "kpis": [
            {"label": "Command score", "value": command_score, "unit": "/100", "health": _health(command_score), "question": "Can leadership trust the current operating rhythm?"},
            {"label": "Forecasted offers", "value": forecast_offers, "unit": "", "health": forecast_confidence, "question": "Where do we land if current pipeline converts?"},
            {"label": "Funnel conversion", "value": conversion, "unit": "%", "health": _health(conversion), "question": "How efficiently does demand become selection?"},
            {"label": "Intervention load", "value": readiness.get("needs_intervention", 0), "unit": "", "health": "watch" if readiness.get("needs_intervention", 0) else "strong", "question": "How much faculty work is required now?"},
        ],
        "trend": trend,
        "funnel": funnel_rows,
        "department_health": department_health,
        "forecast": {
            "forecasted_offers": forecast_offers,
            "confidence": forecast_confidence,
            "open_capacity": open_capacity,
            "interview_stage": funnel.get("Interview", 0),
            "previous_offers": previous.get("offers", 0),
            "latest_offers": latest.get("offers", 0),
        },
        "risk_register": risk_register[:8],
        "recommendations": recommendations,
    }


@app.get("/api/analytics/engine")
async def analytics_engine(
    department: Optional[str] = None,
    user=Depends(require_roles("super_admin", "institution_admin", "tpo", "faculty")),
):
    return await _analytics_engine_payload(user, department=department)


# ============== APPLICATIONS / JOBS ==============
@app.get("/api/jobs")
async def list_jobs(status: Optional[str] = "open", user=Depends(get_session_user)):
    query = {}
    if status and status != "all":
        query["status"] = status
    if user["role"] == "recruiter":
        recruiter_id = await _resolve_recruiter_id(user)
        query["recruiter_id"] = recruiter_id or "__none__"
    elif user["role"] != "super_admin" and user.get("institution_id"):
        query["institutions"] = {"$in": [user["institution_id"]]}
    items = await db.jobs.find(query, {"_id": 0}).sort("drive_date", -1).limit(80).to_list(80)
    return {"items": items}


@app.post("/api/jobs")
async def create_job(
    body: dict,
    request: Request,
    user=Depends(require_roles("recruiter", "super_admin", "tpo", "institution_admin")),
):
    body["job_id"] = f"job_{uuid.uuid4().hex[:10]}"
    body.setdefault("status", "open")
    body.setdefault("applied_count", 0)
    body.setdefault("created_at", datetime.now(timezone.utc).isoformat())
    body["created_by"] = user["user_id"]
    if user["role"] != "super_admin" and user.get("institution_id"):
        body["institutions"] = [user["institution_id"]]
    if user["role"] == "recruiter":
        recruiter_id = await _resolve_recruiter_id(user)
        body["recruiter_id"] = recruiter_id or "__none__"
        body.setdefault("institutions", ["inst_kmit"])
        recruiter = await db.recruiters.find_one({"recruiter_id": recruiter_id}, {"_id": 0}) if recruiter_id else None
        if recruiter and not body.get("company"):
            body["company"] = recruiter.get("name")
    await db.jobs.insert_one(body)
    await _audit_log(
        "job.created",
        user=user,
        institution_id=(body.get("institutions") or [user.get("institution_id") or "global"])[0],
        resource="job",
        resource_id=body["job_id"],
        metadata={"company": body.get("company"), "role": body.get("role")},
        request=request,
    )
    return {"job_id": body["job_id"]}


@app.get("/api/applications")
async def list_applications(stage: Optional[str] = None, company: Optional[str] = None, user=Depends(get_session_user)):
    query = {}
    if user["role"] == "student":
        query["student_id"] = user.get("student_id") or "__none__"
    elif user["role"] == "recruiter":
        recruiter_id = await _resolve_recruiter_id(user)
        jobs = await db.jobs.find({"recruiter_id": recruiter_id or "__none__"}, {"_id": 0, "job_id": 1}).to_list(500)
        query["job_id"] = {"$in": [job["job_id"] for job in jobs]}
    elif user["role"] != "super_admin":
        if user.get("institution_id"):
            query["institution_id"] = user["institution_id"]
    if user["role"] == "faculty" and user.get("department"):
        query["department"] = user["department"]
    if stage:
        query["stage"] = stage
    if company:
        query["company"] = company
    items = await db.applications.find(query, {"_id": 0}).sort("applied_at", -1).limit(200).to_list(200)
    # Pipeline counts (same filter without stage)
    pipe_query = {k: v for k, v in query.items() if k != "stage"}
    pipeline = [{"$match": pipe_query},
                {"$group": {"_id": "$stage", "n": {"$sum": 1}}}]
    counts = await db.applications.aggregate(pipeline).to_list(20)
    pipeline_counts = _pipeline_counts(items)
    for count in counts:
        pipeline_counts[count["_id"]] = count["n"]
    total = sum(pipeline_counts.values())
    selected = pipeline_counts.get("Selected", 0)
    rejected = pipeline_counts.get("Rejected", 0)
    active = total - selected - rejected
    analytics = {
        "total": total,
        "active": active,
        "conversion_rate": _pct(selected, max(1, total), 1),
        "interview_rate": _pct(pipeline_counts.get("Interview", 0), max(1, total), 1),
        "drop_rate": _pct(rejected, max(1, total), 1),
        "next_actions": [
            _workspace_action("Advance shortlisted candidates", "/recruiter/applications" if user["role"] == "recruiter" else "/tpo/applications", priority="high", reason=f"{pipeline_counts.get('Shortlisted', 0)} shortlisted candidates need a next step"),
            _workspace_action("Schedule interview queue", "/recruiter/schedule" if user["role"] == "recruiter" else "/tpo/schedule", priority="high", reason=f"{pipeline_counts.get('Interview', 0)} interview-stage candidates"),
        ],
    }
    return {"items": items, "pipeline": pipeline_counts, "analytics": analytics}


@app.patch("/api/applications/{application_id}")
async def update_application(
    application_id: str,
    body: dict,
    request: Request,
    user=Depends(require_roles("super_admin", "tpo", "recruiter", "institution_admin")),
):
    app_doc = await db.applications.find_one({"application_id": application_id}, {"_id": 0})
    if not app_doc:
        raise HTTPException(404, "application not found")
    if user["role"] == "recruiter":
        recruiter_id = await _resolve_recruiter_id(user)
        job = await db.jobs.find_one({"job_id": app_doc.get("job_id"), "recruiter_id": recruiter_id or "__none__"}, {"_id": 0})
        if not job:
            raise HTTPException(403, "forbidden")
    else:
        require_same_institution(app_doc.get("institution_id"), user)
    allowed = {"stage", "next_step_at"}
    update = {k: v for k, v in body.items() if k in allowed}
    if not update:
        return {"updated": 0}
    if "stage" in update and update["stage"] not in {"Applied", "Shortlisted", "Assessment", "Interview", "Selected", "Rejected"}:
        raise HTTPException(400, "Invalid application stage")
    update["updated_at"] = datetime.now(timezone.utc).isoformat()
    update["updated_by"] = user["user_id"]
    r = await db.applications.update_one({"application_id": application_id}, {"$set": update})
    # Broadcast live update
    app_doc = await db.applications.find_one({"application_id": application_id}, {"_id": 0})
    if app_doc:
        await ws_manager.broadcast(app_doc["institution_id"], {
            "type": "application.updated",
            "application_id": application_id,
            "stage": app_doc.get("stage"),
            "student_name": app_doc.get("student_name"),
            "company": app_doc.get("company"),
            "ts": datetime.now(timezone.utc).isoformat(),
        })
    await _audit_log(
        "application.updated",
        user=user,
        institution_id=app_doc.get("institution_id") if app_doc else None,
        resource="application",
        resource_id=application_id,
        metadata={"fields": sorted(update.keys()), "stage": update.get("stage")},
        request=request,
    )
    return {"updated": r.modified_count}


# ============== RECRUITER INTELLIGENCE ==============
@app.get("/api/recruiters")
async def list_recruiters(user=Depends(get_session_user)):
    items = await db.recruiters.find({}, {"_id": 0}).sort("hires_total", -1).limit(60).to_list(60)
    return {"items": items}


@app.get("/api/recruiters/me/talent-pool")
async def my_recruiter_talent_pool(
    min_cgpa: float = 6.5,
    min_readiness: float = 0,
    department: Optional[str] = None,
    skill: Optional[str] = None,
    limit: int = 60,
    user=Depends(require_roles("recruiter")),
):
    recruiter_id = await _resolve_recruiter_id(user)
    return await _recruiter_talent_pool_payload(
        recruiter_id,
        min_cgpa=min_cgpa,
        min_readiness=min_readiness,
        department=department,
        skill=skill,
        limit=limit,
    )


@app.get("/api/recruiters/me/analytics")
async def my_recruiter_analytics(user=Depends(require_roles("recruiter"))):
    recruiter_id = await _resolve_recruiter_id(user)
    recruiter = await db.recruiters.find_one({"recruiter_id": recruiter_id}, {"_id": 0}) if recruiter_id else None
    jobs = await db.jobs.find({"recruiter_id": recruiter_id or "__none__"}, {"_id": 0}).sort("drive_date", -1).to_list(500)
    job_ids = [job["job_id"] for job in jobs]
    app_query = {"job_id": {"$in": job_ids}} if job_ids else {"job_id": "__none__"}
    applications = await db.applications.find(app_query, {"_id": 0}).sort("applied_at", -1).to_list(1000)
    pipeline = _pipeline_counts(applications)
    selected = pipeline.get("Selected", 0)
    rejected = pipeline.get("Rejected", 0)
    total = sum(pipeline.values())
    open_jobs = [job for job in jobs if job.get("status") == "open"]
    package_values = [job.get("ctc_lpa", 0) or 0 for job in jobs]

    apps_by_job: dict[str, list[dict]] = {}
    for application in applications:
        apps_by_job.setdefault(application.get("job_id"), []).append(application)
    job_funnels = []
    for job in jobs:
        job_apps = apps_by_job.get(job["job_id"], [])
        counts = _pipeline_counts(job_apps)
        job_funnels.append({
            "job_id": job["job_id"],
            "company": job.get("company"),
            "title": job.get("title"),
            "status": job.get("status"),
            "ctc_lpa": job.get("ctc_lpa"),
            "openings": job.get("openings"),
            "applications": sum(counts.values()),
            "pipeline": counts,
            "conversion_rate": _pct(counts.get("Selected", 0), max(1, sum(counts.values())), 1),
            "interview_rate": _pct(counts.get("Interview", 0), max(1, sum(counts.values())), 1),
        })
    job_funnels.sort(key=lambda row: (row["applications"], row["conversion_rate"]), reverse=True)

    by_inst: dict[str, dict[str, Any]] = {}
    for application in applications:
        iid = application.get("institution_id", "unknown")
        row = by_inst.setdefault(iid, {"institution_id": iid, "applications": 0, "selected": 0, "interview": 0, "rejected": 0})
        row["applications"] += 1
        stage = application.get("stage")
        if stage == "Selected":
            row["selected"] += 1
        elif stage == "Interview":
            row["interview"] += 1
        elif stage == "Rejected":
            row["rejected"] += 1
    inst_docs = await db.institutions.find({"institution_id": {"$in": list(by_inst.keys())}}, {"_id": 0}).to_list(100)
    inst_names = {inst["institution_id"]: inst.get("short_name") or inst.get("name") for inst in inst_docs}
    institution_funnel = []
    for row in by_inst.values():
        row["institution"] = inst_names.get(row["institution_id"], row["institution_id"])
        row["conversion_rate"] = _pct(row["selected"], max(1, row["applications"]), 1)
        institution_funnel.append(row)
    institution_funnel.sort(key=lambda row: row["applications"], reverse=True)

    scheduled = await db.interview_schedule.find(
        {"job_id": {"$in": job_ids}} if job_ids else {"job_id": "__none__"},
        {"_id": 0},
    ).sort("starts_at", 1).to_list(200)
    upcoming = [
        item for item in scheduled
        if item.get("status") != "cancelled" and item.get("starts_at", "") >= datetime.now(timezone.utc).isoformat()
    ][:10]
    talent = await _recruiter_talent_pool_payload(recruiter_id, min_cgpa=6.5, min_readiness=72, limit=20)
    interview_backlog = pipeline.get("Interview", 0)
    shortlist_backlog = pipeline.get("Shortlisted", 0)
    action_queue = [
        _workspace_action("Review high-readiness talent", "/recruiter/talent", priority="high", reason=f"{talent['count']} candidates above readiness 72"),
        _workspace_action("Advance shortlist backlog", "/recruiter/applications", priority="high", reason=f"{shortlist_backlog} shortlisted candidates need action"),
        _workspace_action("Schedule interview backlog", "/recruiter/schedule", priority="medium", reason=f"{interview_backlog} candidates are interview-stage"),
    ]
    return {
        "recruiter": recruiter,
        "recruiter_id": recruiter_id,
        "summary": {
            "jobs": len(jobs),
            "open_jobs": len(open_jobs),
            "applications": total,
            "selected": selected,
            "rejected": rejected,
            "active": total - selected - rejected,
            "conversion_rate": _pct(selected, max(1, total), 1),
            "interview_rate": _pct(pipeline.get("Interview", 0), max(1, total), 1),
            "avg_package_lpa": round(sum(package_values) / max(1, len(package_values)), 1),
            "top_package_lpa": max(package_values) if package_values else 0,
            "talent_ready": talent["count"],
            "upcoming_interviews": len(upcoming),
        },
        "pipeline": pipeline,
        "job_funnels": job_funnels[:12],
        "institution_funnel": institution_funnel[:12],
        "package_intelligence": {
            "avg_lpa": round(sum(package_values) / max(1, len(package_values)), 1),
            "top_lpa": max(package_values) if package_values else 0,
            "open_role_capacity": sum(job.get("openings", 0) or 0 for job in open_jobs),
        },
        "upcoming_interviews": upcoming,
        "action_queue": action_queue,
    }


def _candidate_skill_match(candidate: dict, job: dict) -> dict:
    candidate_skills = {skill.lower() for skill in candidate.get("skills", [])}
    required = {skill.lower() for skill in job.get("skills", []) or []}
    if not required:
        title = " ".join([job.get("title", ""), job.get("role", "")]).lower()
        required = {skill for skill in ["python", "java", "react", "sql", "aws", "dsa", "machine learning"] if skill in title}
    overlap = sorted(candidate_skills.intersection(required))
    missing = sorted(required.difference(candidate_skills))
    score = _pct(len(overlap), max(1, len(required)), 1) if required else min(100, candidate.get("readiness_score", 0) or 0)
    return {"score": score, "matched_skills": overlap, "missing_skills": missing}


@app.get("/api/recruiters/me/recommendations")
async def my_recruiter_recommendations(user=Depends(require_roles("recruiter"))):
    recruiter_id = await _resolve_recruiter_id(user)
    jobs = await db.jobs.find({"recruiter_id": recruiter_id or "__none__", "status": "open"}, {"_id": 0}).sort("drive_date", -1).to_list(20)
    base_pool = await _recruiter_talent_pool_payload(recruiter_id, min_cgpa=6.0, min_readiness=0, limit=120)
    recommendations = []
    for job in jobs[:8]:
        for candidate in base_pool.get("items", []):
            match = _candidate_skill_match(candidate, job)
            readiness = candidate.get("readiness_score", 0) or 0
            ats = candidate.get("ats_score", 0) or 0
            cgpa = float(candidate.get("cgpa") or 0)
            interview_next_score = round((readiness * 0.45) + (ats * 0.20) + (match["score"] * 0.25) + (min(100, cgpa * 10) * 0.10), 1)
            recommendations.append({
                "job_id": job["job_id"],
                "job_title": job.get("title"),
                "company": job.get("company"),
                "student_id": candidate["student_id"],
                "student_name": candidate.get("name"),
                "roll_number": candidate.get("roll_number"),
                "department": candidate.get("department"),
                "cgpa": candidate.get("cgpa"),
                "readiness_score": readiness,
                "ats_score": ats,
                "skill_match_score": match["score"],
                "matched_skills": match["matched_skills"],
                "missing_skills": match["missing_skills"],
                "interview_next_score": interview_next_score,
                "answer": "Interview next" if interview_next_score >= 76 else "Keep warm" if interview_next_score >= 64 else "Needs evidence",
            })
    recommendations.sort(key=lambda row: row["interview_next_score"], reverse=True)
    return {
        "items": recommendations[:40],
        "jobs_considered": len(jobs),
        "answer": "Which students should I interview next?",
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/api/recruiters/me/shortlists")
async def my_recruiter_shortlists(user=Depends(require_roles("recruiter"))):
    recruiter_id = await _resolve_recruiter_id(user)
    items = await db.recruiter_shortlists.find({"recruiter_id": recruiter_id or "__none__"}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return {"items": items, "count": len(items)}


@app.post("/api/recruiters/me/shortlists")
async def create_recruiter_shortlist(body: dict, request: Request, user=Depends(require_roles("recruiter"))):
    recruiter_id = await _resolve_recruiter_id(user)
    student_id = body.get("student_id")
    if not student_id:
        raise HTTPException(400, "student_id required")
    student = await db.students.find_one({"student_id": student_id}, {"_id": 0})
    if not student:
        raise HTTPException(404, "student not found")
    item = {
        "shortlist_id": f"short_{uuid.uuid4().hex[:10]}",
        "recruiter_id": recruiter_id,
        "student_id": student_id,
        "job_id": body.get("job_id"),
        "student_name": student.get("name"),
        "roll_number": student.get("roll_number"),
        "department": student.get("department"),
        "institution_id": student.get("institution_id"),
        "readiness_score": body.get("readiness_score"),
        "match_score": body.get("match_score"),
        "status": body.get("status", "shortlisted"),
        "notes": body.get("notes", ""),
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recruiter_shortlists.update_one(
        {"recruiter_id": recruiter_id, "student_id": student_id, "job_id": item.get("job_id")},
        {"$set": item},
        upsert=True,
    )
    await _audit_log(
        "recruiter.shortlisted_candidate",
        user=user,
        institution_id=student.get("institution_id"),
        resource="student",
        resource_id=student_id,
        metadata={"job_id": item.get("job_id"), "match_score": item.get("match_score")},
        request=request,
    )
    return item


@app.get("/api/recruiters/me/saved-filters")
async def my_recruiter_saved_filters(user=Depends(require_roles("recruiter"))):
    recruiter_id = await _resolve_recruiter_id(user)
    items = await db.recruiter_saved_filters.find({"recruiter_id": recruiter_id or "__none__"}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return {"items": items, "count": len(items)}


@app.post("/api/recruiters/me/saved-filters")
async def create_recruiter_saved_filter(body: dict, request: Request, user=Depends(require_roles("recruiter"))):
    recruiter_id = await _resolve_recruiter_id(user)
    item = {
        "filter_id": f"filter_{uuid.uuid4().hex[:10]}",
        "recruiter_id": recruiter_id,
        "name": body.get("name") or "Saved talent view",
        "filters": {
            "min_cgpa": body.get("min_cgpa", 7),
            "min_readiness": body.get("min_readiness", 70),
            "department": body.get("department"),
            "skill": body.get("skill"),
        },
        "created_by": user["user_id"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recruiter_saved_filters.insert_one(item)
    await _audit_log(
        "recruiter.saved_filter_created",
        user=user,
        institution_id=None,
        resource="recruiter_saved_filter",
        resource_id=item["filter_id"],
        metadata=item["filters"],
        request=request,
    )
    item.pop("_id", None)
    return item


@app.get("/api/recruiters/{recruiter_id}/talent-pool")
async def talent_pool(recruiter_id: str, min_cgpa: float = 6.5, user=Depends(require_roles("recruiter", "super_admin"))):
    if user["role"] != "super_admin":
        resolved = await _resolve_recruiter_id(user)
        if recruiter_id != resolved:
            raise HTTPException(403, "forbidden")
        jobs = await db.jobs.find({"recruiter_id": resolved or "__none__"}, {"_id": 0}).to_list(500)
        institution_ids = sorted({iid for job in jobs for iid in job.get("institutions", [])})
        if not institution_ids:
            return {"items": [], "count": 0}
        query = {"institution_id": {"$in": institution_ids}, "cgpa": {"$gte": min_cgpa}}
    else:
        query = {"cgpa": {"$gte": min_cgpa}}
    candidates = await db.students.find(query, {"_id": 0}).limit(120).to_list(120)
    students = []
    for candidate in candidates:
        readiness = await build_student_readiness(db, candidate)
        candidate["readiness_score"] = readiness["score"]
        candidate["readiness_band"] = readiness["band"]
        candidate["readiness_label"] = readiness["label"]
        candidate["readiness_components"] = readiness["components"]
        candidate["readiness_risks"] = readiness["risks"][:3]
        students.append(candidate)
    students.sort(key=lambda row: row.get("readiness_score", 0), reverse=True)
    students = students[:60]
    return {"items": students, "count": len(students)}


# ============== ANNOUNCEMENTS ==============
@app.get("/api/announcements")
async def list_announcements(user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    items = await db.announcements.find({"institution_id": iid}, {"_id": 0}).sort("created_at", -1).limit(20).to_list(20)
    return {"items": items}


@app.post("/api/announcements")
async def create_announcement(
    body: dict,
    request: Request,
    user=Depends(require_roles("tpo", "institution_admin", "faculty", "super_admin")),
):
    body["announcement_id"] = f"ann_{uuid.uuid4().hex[:10]}"
    body["institution_id"] = user.get("institution_id") or "inst_kmit"
    body["by_role"] = user["role"]
    body["created_at"] = datetime.now(timezone.utc).isoformat()
    await db.announcements.insert_one(body)
    await notify(db, event="announcement_posted",
                 to_email=ADMIN_EMAIL, subject=f"Announcement: {body.get('title')}",
                 title=body.get("title", "Announcement"),
                 body_html=f"<p>{body.get('body', '')}</p>",
                 telegram_text=f"📣 {body.get('title')}")
    await _audit_log(
        "announcement.created",
        user=user,
        institution_id=body["institution_id"],
        resource="announcement",
        resource_id=body["announcement_id"],
        metadata={"audience": body.get("audience"), "title": body.get("title")},
        request=request,
    )
    return {"announcement_id": body["announcement_id"]}


# ============== MOU ==============
@app.get("/api/mou")
async def get_mou(user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    if user["role"] == "super_admin":
        iid = "inst_kmit"
    mou = await db.mous.find_one({"institution_id": iid}, {"_id": 0})
    if not mou:
        raise HTTPException(404, "no MOU")
    exp = datetime.fromisoformat(mou["expires_on"])
    if exp.tzinfo is None:
        exp = exp.replace(tzinfo=timezone.utc)
    mou["days_until_renewal"] = (exp - datetime.now(timezone.utc)).days
    return mou


@app.post("/api/mou/upload")
async def upload_mou(
    request: Request,
    file: UploadFile = File(...),
    expires_on: str = Form(...),
    partnership_type: str = Form("CRT"),
    user=Depends(require_roles("super_admin", "tpo", "institution_admin")),
):
    iid = user.get("institution_id") or "inst_kmit"
    content = await file.read()
    size_kb = round(len(content) / 1024, 1)
    # Persist actual bytes in GridFS
    gridfs_id = await gridfs.upload_from_stream(
        f"{iid}__{file.filename}",
        content,
        metadata={"institution_id": iid, "uploader_user_id": user["user_id"],
                  "content_type": file.content_type, "uploaded_at": datetime.now(timezone.utc).isoformat()},
    )
    await db.mous.update_one({"institution_id": iid}, {"$set": {
        "institution_id": iid, "document_name": file.filename,
        "document_size_kb": size_kb, "partnership_type": partnership_type,
        "expires_on": expires_on, "signed_on": datetime.now(timezone.utc).isoformat(),
        "status": "active",
        "gridfs_id": str(gridfs_id),
        "content_type": file.content_type or "application/pdf",
    }}, upsert=True)
    await notify(db, event="mou_uploaded", to_email=ADMIN_EMAIL,
                 subject=f"MOU uploaded — {iid}", title="MOU received",
                 body_html=f"<p>{file.filename} ({size_kb} KB) uploaded.</p>",
                 telegram_text=f"📄 MOU · {iid}")
    await _audit_log(
        "mou.uploaded",
        user=user,
        institution_id=iid,
        resource="mou",
        resource_id=str(gridfs_id),
        metadata={"filename": file.filename, "size_kb": size_kb, "partnership_type": partnership_type},
        request=request,
    )
    return {"ok": True, "document_name": file.filename, "size_kb": size_kb, "gridfs_id": str(gridfs_id)}


@app.get("/api/mou/download")
async def download_mou(user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    if user["role"] == "super_admin":
        iid = "inst_kmit"
    mou = await db.mous.find_one({"institution_id": iid}, {"_id": 0})
    if not mou or not mou.get("gridfs_id"):
        raise HTTPException(404, "No file on record")
    file_id: Any = mou["gridfs_id"]
    if client is not None:
        from bson import ObjectId
        file_id = ObjectId(file_id)
    stream = await gridfs.open_download_stream(file_id)
    data = await stream.read()

    def gen():
        yield data

    return StreamingResponse(
        gen(),
        media_type=mou.get("content_type", "application/pdf"),
        headers={"Content-Disposition": f"attachment; filename=\"{mou['document_name']}\""},
    )


# ============== ADMIN PANEL ==============
@app.get("/api/admin/pending-signups")
async def pending_signups(admin=Depends(require_roles("super_admin"))):
    pending = await db.users.find({"approved": False}, {"_id": 0, "password_hash": 0}).to_list(200)
    ids = list({u["institution_id"] for u in pending if u.get("institution_id")})
    insts = await db.institutions.find({"institution_id": {"$in": ids}}, {"_id": 0}).to_list(200)
    imap = {i["institution_id"]: i for i in insts}
    for u in pending:
        u["institution"] = imap.get(u.get("institution_id"))
    return {"items": pending}


@app.post("/api/admin/approve/{user_id}")
async def approve_user(user_id: str, request: Request, admin=Depends(require_roles("super_admin"))):
    t = await db.users.find_one({"user_id": user_id})
    if not t:
        raise HTTPException(404, "not found")
    await db.users.update_one({"user_id": user_id}, {"$set": {"approved": True}})
    if t.get("institution_id"):
        await db.institutions.update_one({"institution_id": t["institution_id"]},
                                         {"$set": {"approved": True, "approved_at": datetime.now(timezone.utc).isoformat()}})
    await notify(db, event="account_approved", to_email=t["email"],
                 subject="Your CareerOS access is live",
                 title="Welcome aboard",
                 body_html=f"<p>Hi {t['name']}, your CareerOS access is now active.</p>",
                 telegram_text=f"Approved - {t['email']}")
    await _audit_log(
        "admin.user_approved",
        user=admin,
        institution_id=t.get("institution_id"),
        resource="user",
        resource_id=user_id,
        metadata={"target_email": t.get("email"), "target_role": t.get("role")},
        request=request,
    )
    return {"ok": True}


@app.post("/api/admin/reject/{user_id}")
async def reject_user(user_id: str, request: Request, admin=Depends(require_roles("super_admin"))):
    t = await db.users.find_one({"user_id": user_id})
    if not t:
        raise HTTPException(404, "not found")
    await db.users.delete_one({"user_id": user_id})
    if t.get("institution_id"):
        await db.institutions.delete_one({"institution_id": t["institution_id"], "approved": False})
    await _audit_log(
        "admin.user_rejected",
        user=admin,
        institution_id=t.get("institution_id"),
        resource="user",
        resource_id=user_id,
        metadata={"target_email": t.get("email"), "target_role": t.get("role")},
        request=request,
    )
    return {"ok": True}


@app.get("/api/admin/notifications")
async def admin_notifications(admin=Depends(require_roles("super_admin"))):
    items = await db.notification_log.find({}, {"_id": 0}).sort("created_at", -1).limit(100).to_list(100)
    return {"items": items}


@app.get("/api/admin/audit-logs")
async def admin_audit_logs(
    institution_id: Optional[str] = None,
    event: Optional[str] = None,
    limit: int = 100,
    admin=Depends(require_roles("super_admin")),
):
    query: dict[str, Any] = {}
    if institution_id:
        query["institution_id"] = institution_id
    if event:
        query["event"] = event
    safe_limit = max(1, min(limit, 500))
    items = await db.audit_logs.find(query, {"_id": 0}).sort("created_at", -1).limit(safe_limit).to_list(safe_limit)
    return {"items": items}


@app.post("/api/admin/test-notification")
async def test_notification(admin=Depends(require_roles("super_admin"))):
    await notify(db, event="admin_test", to_email=ADMIN_EMAIL,
                 subject="CareerOS · Test notification",
                 title="Heartbeat",
                 body_html="<p>Test fan-out triggered.</p>",
                 telegram_text="🔔 CareerOS test")
    return {"ok": True}


@app.get("/api/admin/platform-stats")
async def platform_stats(admin=Depends(require_roles("super_admin"))):
    n_inst = await db.institutions.count_documents({"approved": True})
    n_pending = await db.users.count_documents({"approved": False})
    n_students = await db.students.count_documents({})
    n_apps = await db.applications.count_documents({})
    n_jobs_open = await db.jobs.count_documents({"status": "open"})
    n_recruiters = await db.recruiters.count_documents({})
    # MRR-style proxy: 18% rev share × placed offer count × avg LPA × ₹/lpa-share
    placed = await db.students.count_documents({"placement.placed": True})
    estimated_mrr = round(placed * 0.18 * 6 * 1000 / 12, 0)  # rough proxy
    by_type_pipeline = [{"$group": {"_id": "$type", "n": {"$sum": 1}}}]
    by_type = await db.institutions.aggregate(by_type_pipeline).to_list(20)
    return {
        "institutions": n_inst, "pending_signups": n_pending,
        "students": n_students, "applications": n_apps,
        "jobs_open": n_jobs_open, "recruiters": n_recruiters,
        "estimated_mrr_inr": estimated_mrr,
        "by_type": [{"type": b["_id"], "count": b["n"]} for b in by_type],
    }


@app.get("/api/admin/colleges")
async def admin_colleges(admin=Depends(require_roles("super_admin"))):
    items = await db.institutions.find({}, {"_id": 0}).to_list(500)
    return {"items": items}


# ============== REPORTS (PDF + CSV) ==============
REPORT_MANIFEST = [
    {
        "report_id": "placement_pdf",
        "title": "Placement board report",
        "kind": "pdf",
        "audience": "Board / leadership",
        "cadence": "Weekly during drive season",
        "href": "/reports/placement.pdf",
        "file": "placement-report.pdf",
        "decision": "Are offers, CTC, departments, and recruiters moving in the right direction?",
        "phase": "Phase 8",
    },
    {
        "report_id": "training_pdf",
        "title": "Training intervention report",
        "kind": "pdf",
        "audience": "TPO / faculty",
        "cadence": "Twice per week",
        "href": "/reports/training.pdf",
        "file": "training-report.pdf",
        "decision": "Which cohorts need faculty action before the next drive?",
        "phase": "Phase 8",
    },
    {
        "report_id": "department_pdf",
        "title": "Department health report",
        "kind": "pdf",
        "audience": "HOD / institution admin",
        "cadence": "Weekly",
        "href": "/reports/department.pdf",
        "file": "department-report.pdf",
        "decision": "Which department is underperforming and why?",
        "phase": "Phase 8",
    },
    {
        "report_id": "students_csv",
        "title": "Student intelligence export",
        "kind": "csv",
        "audience": "Ops / downstream tooling",
        "cadence": "On demand",
        "href": "/reports/students.csv",
        "file": "students.csv",
        "decision": "Which students should move into action lists?",
        "phase": "Phase 8",
    },
    {
        "report_id": "applications_csv",
        "title": "Application pipeline export",
        "kind": "csv",
        "audience": "TPO / recruiters",
        "cadence": "Daily during drives",
        "href": "/reports/applications.csv",
        "file": "applications.csv",
        "decision": "Where are applications stuck?",
        "phase": "Phase 8",
    },
    {
        "report_id": "placements_csv",
        "title": "Placement ledger export",
        "kind": "csv",
        "audience": "Analytics / audit",
        "cadence": "Monthly",
        "href": "/reports/placements.csv",
        "file": "placements.csv",
        "decision": "Which recruiter relationships compound over time?",
        "phase": "Phase 8",
    },
]


def _stream(content: io.BytesIO, filename: str, media_type: str):
    content.seek(0)
    return StreamingResponse(
        iter([content.read()]),
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@app.get("/api/reports/manifest")
async def reports_manifest(user=Depends(require_roles("super_admin", "institution_admin", "tpo", "faculty"))):
    analytics = await _analytics_engine_payload(user)
    exports_generated = await db.audit_logs.count_documents({"event": {"$in": [
        "report.placement_exported",
        "report.training_exported",
        "report.department_exported",
        "report.csv_exported",
    ]}})
    return {
        "items": REPORT_MANIFEST,
        "board_packet": {
            "title": "CareerOS Intelligence Board Packet",
            "status": "ready" if analytics["summary"]["health"] not in {"critical"} else "needs_review",
            "command_score": analytics["summary"]["command_score"],
            "forecasted_offers": analytics["forecast"]["forecasted_offers"],
            "risk_count": len(analytics["risk_register"]),
            "recommended_sequence": ["placement_pdf", "department_pdf", "training_pdf", "applications_csv"],
        },
        "usage": {
            "exports_generated": exports_generated,
            "last_generated_at": datetime.now(timezone.utc).isoformat(),
        },
    }


@app.get("/api/reports/board-packet.json")
async def reports_board_packet(user=Depends(require_roles("super_admin", "institution_admin", "tpo", "faculty"))):
    analytics = await _analytics_engine_payload(user)
    modules = await module_intelligence(user=user)
    return {
        "title": "CareerOS Intelligence Board Packet",
        "scope": analytics["scope"],
        "executive_summary": analytics["summary"],
        "forecast": analytics["forecast"],
        "risk_register": analytics["risk_register"],
        "recommendations": analytics["recommendations"],
        "module_health": modules["cards"],
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }


async def _institution_overview_for_reports(iid: str) -> dict:
    """Lightweight version of placements_overview that doesn't require auth coupling."""
    years = await db.year_summaries.find({"institution_id": iid}, {"_id": 0}).sort("academic_year", -1).to_list(20)
    records = await db.placement_records.find({"institution_id": iid}, {"_id": 0}).to_list(500)
    placed = await db.students.count_documents({"institution_id": iid, "placement.placed": True})
    total = await db.students.count_documents({"institution_id": iid})
    pipeline = [{"$match": {"institution_id": iid}},
                {"$group": {"_id": "$company", "selects": {"$sum": "$selects"}, "max_ctc": {"$max": "$ctc_lpa"}}},
                {"$sort": {"selects": -1}}, {"$limit": 15}]
    top = await db.placement_records.aggregate(pipeline).to_list(20)
    top = [{"company": r["_id"], "selects": r["selects"], "max_ctc": r["max_ctc"]} for r in top]
    inst = await db.institutions.find_one({"institution_id": iid}, {"_id": 0})
    dept = []
    for d in (inst["departments"] if inst else []):
        p = await db.students.count_documents({"institution_id": iid, "department": d, "placement.placed": True})
        t = await db.students.count_documents({"institution_id": iid, "department": d})
        dept.append({"department": d, "placed": p, "total": t})
    return {"year_summaries": years, "records": records, "top_recruiters": top,
            "department_breakdown": dept, "students_placed": placed, "students_total": total}


@app.get("/api/reports/placement.pdf")
async def report_placement_pdf(request: Request, user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    inst = await db.institutions.find_one({"institution_id": iid}, {"_id": 0}) or {}
    overview = await _institution_overview_for_reports(iid)
    pdf = placement_report_pdf(inst, overview)
    await _audit_log("report.placement_exported", user=user, institution_id=iid, resource="report", resource_id="placement_pdf", request=request)
    return _stream(pdf, f"placement-report-{inst.get('short_name', 'institution')}.pdf", "application/pdf")


@app.get("/api/reports/training.pdf")
async def report_training_pdf(request: Request, user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    inst = await db.institutions.find_one({"institution_id": iid}, {"_id": 0}) or {}
    pipeline = [{"$match": {"institution_id": iid}},
                {"$group": {"_id": "$program_code",
                            "avg_completion": {"$avg": "$completion_pct"},
                            "completed": {"$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}},
                            "in_progress": {"$sum": {"$cond": [{"$eq": ["$status", "in_progress"]}, 1, 0]}},
                            "enrolled": {"$sum": 1}}}]
    by_program = await db.enrollments.aggregate(pipeline).to_list(20)
    prog_map = {p["code"]: p for p in PROGRAMS}
    for r in by_program:
        meta = prog_map.get(r["_id"], {})
        r["program_code"] = r["_id"]; r["program_name"] = meta.get("name", r["_id"])
        r["avg_completion"] = round(r["avg_completion"] or 0, 1)
    enroll = await db.enrollments.find({"institution_id": iid}, {"_id": 0}).sort("completion_pct", -1).limit(60).to_list(60)
    sids = list({e["student_id"] for e in enroll})
    students = await db.students.find({"student_id": {"$in": sids}}, {"_id": 0}).to_list(200)
    smap = {s["student_id"]: s for s in students}
    for e in enroll:
        s = smap.get(e["student_id"], {})
        e["student_name"] = s.get("name", "—"); e["roll_number"] = s.get("roll_number", "—"); e["department"] = s.get("department", "—")
    pdf = training_report_pdf(inst, {"by_program": by_program, "rows": enroll})
    await _audit_log("report.training_exported", user=user, institution_id=iid, resource="report", resource_id="training_pdf", request=request)
    return _stream(pdf, f"training-report-{inst.get('short_name', 'institution')}.pdf", "application/pdf")


@app.get("/api/reports/department.pdf")
async def report_department_pdf(request: Request, user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    inst = await db.institutions.find_one({"institution_id": iid}, {"_id": 0}) or {}
    overview = await _institution_overview_for_reports(iid)
    students = await db.students.find({"institution_id": iid}, {"_id": 0}).to_list(1000)
    pdf = department_report_pdf(inst, overview, students)
    await _audit_log("report.department_exported", user=user, institution_id=iid, resource="report", resource_id="department_pdf", request=request)
    return _stream(pdf, f"department-report-{inst.get('short_name', 'institution')}.pdf", "application/pdf")


@app.get("/api/reports/students.csv")
async def report_students_csv(request: Request, department: Optional[str] = None, user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    if user["role"] == "super_admin":
        iid = "inst_kmit"
    q = {"institution_id": iid}
    if department:
        q["department"] = department
    items = await db.students.find(q, {"_id": 0}).to_list(2000)
    buf = students_csv(items)
    await _audit_log("report.csv_exported", user=user, institution_id=iid, resource="report", resource_id="students_csv", metadata={"rows": len(items)}, request=request)
    return _stream(buf, "students.csv", "text/csv")


@app.get("/api/reports/applications.csv")
async def report_applications_csv(request: Request, user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    items = await db.applications.find({"institution_id": iid}, {"_id": 0}).to_list(2000)
    buf = applications_csv(items)
    await _audit_log("report.csv_exported", user=user, institution_id=iid, resource="report", resource_id="applications_csv", metadata={"rows": len(items)}, request=request)
    return _stream(buf, "applications.csv", "text/csv")


@app.get("/api/reports/placements.csv")
async def report_placements_csv(request: Request, user=Depends(get_session_user)):
    iid = user.get("institution_id") or "inst_kmit"
    records = await db.placement_records.find({"institution_id": iid}, {"_id": 0}).to_list(2000)
    buf = placements_csv(records)
    await _audit_log("report.csv_exported", user=user, institution_id=iid, resource="report", resource_id="placements_csv", metadata={"rows": len(records)}, request=request)
    return _stream(buf, "placements.csv", "text/csv")


# ============== INTERVIEW SCHEDULING ==============
class InterviewScheduleBody(BaseModel):
    student_id: str
    job_id: Optional[str] = None
    company: str
    role: str
    type: Literal["Technical", "HR", "System Design", "Behavioral", "Final"] = "Technical"
    starts_at: str  # ISO datetime
    duration_min: int = 45
    location: str = "Online · Zoom"
    notes: Optional[str] = None


@app.get("/api/interviews/schedule")
async def list_scheduled_interviews(user=Depends(get_session_user)):
    iid = user.get("institution_id")
    if user["role"] == "student":
        items = await db.interview_schedule.find({"student_id": user.get("student_id")}, {"_id": 0}).sort("starts_at", 1).to_list(60)
    elif user["role"] == "recruiter":
        recruiter_id = await _resolve_recruiter_id(user)
        jobs = await db.jobs.find({"recruiter_id": recruiter_id or "__none__"}, {"_id": 0, "job_id": 1}).to_list(500)
        job_ids = [job["job_id"] for job in jobs]
        items = await db.interview_schedule.find(
            {"job_id": {"$in": job_ids}} if job_ids else {"job_id": "__none__"},
            {"_id": 0},
        ).sort("starts_at", 1).to_list(120)
    elif iid:
        items = await db.interview_schedule.find({"institution_id": iid}, {"_id": 0}).sort("starts_at", 1).to_list(120)
    else:
        items = []
    return {"items": items}


@app.post("/api/interviews/schedule")
async def schedule_interview(
    body: InterviewScheduleBody,
    request: Request,
    user=Depends(require_roles("tpo", "institution_admin", "recruiter", "super_admin")),
):
    student = await db.students.find_one({"student_id": body.student_id}, {"_id": 0})
    if not student:
        raise HTTPException(404, "student not found")
    if user["role"] == "recruiter":
        recruiter_id = await _resolve_recruiter_id(user)
        if not body.job_id:
            raise HTTPException(400, "job_id required for recruiter scheduling")
        job = await db.jobs.find_one({"job_id": body.job_id, "recruiter_id": recruiter_id or "__none__"}, {"_id": 0})
        if not job or student["institution_id"] not in job.get("institutions", []):
            raise HTTPException(403, "forbidden")
    else:
        require_same_institution(student.get("institution_id"), user)
    start_dt = datetime.fromisoformat(body.starts_at.replace("Z", "+00:00"))
    if start_dt.tzinfo is None:
        start_dt = start_dt.replace(tzinfo=timezone.utc)
    end_dt = start_dt + timedelta(minutes=body.duration_min)
    interview_id = f"isch_{uuid.uuid4().hex[:10]}"
    record = {
        "interview_id": interview_id,
        "student_id": body.student_id,
        "student_name": student["name"],
        "student_email": student["email"],
        "roll_number": student["roll_number"],
        "department": student["department"],
        "institution_id": student["institution_id"],
        "company": body.company,
        "role": body.role,
        "type": body.type,
        "starts_at": start_dt.isoformat(),
        "ends_at": end_dt.isoformat(),
        "duration_min": body.duration_min,
        "location": body.location,
        "notes": body.notes,
        "status": "scheduled",
        "scheduled_by": user["user_id"],
        "scheduled_at": datetime.now(timezone.utc).isoformat(),
        "job_id": body.job_id,
    }
    await db.interview_schedule.insert_one(record)

    # Build .ics + send notification with attachment
    ics_bytes = build_ics(
        uid=f"{interview_id}@careeros.app",
        summary=f"{body.company} · {body.role} interview",
        description=f"{body.type} interview with {body.company}.\nLocation: {body.location}\n{(body.notes or '')}",
        location=body.location,
        start_utc=start_dt,
        end_utc=end_dt,
        organizer_email=os.environ.get("SENDER_EMAIL", "careeros.notify@careeros.app"),
        attendee_emails=[student["email"]],
    )
    await notify(
        db,
        event="interview_scheduled",
        to_email=student["email"],
        subject=f"Interview scheduled — {body.company}",
        title=f"You have an interview with {body.company}",
        body_html=(f"<p>Hi {student['name'].split()[0]},</p>"
                   f"<p>Your <b>{body.type}</b> interview for the <b>{body.role}</b> role at <b>{body.company}</b> is scheduled.</p>"
                   f"<p><b>When:</b> {start_dt.strftime('%A, %d %B %Y · %H:%M UTC')}<br/>"
                   f"<b>Duration:</b> {body.duration_min} min<br/>"
                   f"<b>Where:</b> {body.location}</p>"
                   f"<p>The calendar invite is attached. Good luck.</p>"),
        telegram_text=f"📅 Interview · {student['name']} · {body.company} · {start_dt.strftime('%d %b %H:%M UTC')}",
        attachments=[{"content": ics_bytes, "filename": "careeros-interview.ics", "mime_type": "text/calendar"}],
    )

    # Update related application to Interview stage if a job_id is provided
    if body.job_id:
        await db.applications.update_one(
            {"student_id": body.student_id, "job_id": body.job_id},
            {"$set": {"stage": "Interview", "next_step_at": start_dt.isoformat()}},
        )

    # Broadcast live update to anyone watching this institution
    await ws_manager.broadcast(student["institution_id"], {
        "type": "interview.scheduled",
        "interview_id": interview_id,
        "student_name": student["name"],
        "company": body.company,
        "starts_at": record["starts_at"],
        "ts": datetime.now(timezone.utc).isoformat(),
    })
    await _audit_log(
        "interview.scheduled",
        user=user,
        institution_id=student["institution_id"],
        resource="interview_schedule",
        resource_id=interview_id,
        metadata={"student_id": body.student_id, "company": body.company, "job_id": body.job_id},
        request=request,
    )
    return {"interview_id": interview_id, "starts_at": record["starts_at"]}


@app.delete("/api/interviews/schedule/{interview_id}")
async def cancel_interview(
    interview_id: str,
    request: Request,
    user=Depends(require_roles("tpo", "institution_admin", "recruiter", "super_admin")),
):
    sched = await db.interview_schedule.find_one({"interview_id": interview_id}, {"_id": 0})
    if not sched:
        raise HTTPException(404, "interview not found")
    if user["role"] == "recruiter":
        recruiter_id = await _resolve_recruiter_id(user)
        job = await db.jobs.find_one({"job_id": sched.get("job_id"), "recruiter_id": recruiter_id or "__none__"}, {"_id": 0})
        if not job:
            raise HTTPException(403, "forbidden")
    else:
        require_same_institution(sched.get("institution_id"), user)
    await db.interview_schedule.update_one({"interview_id": interview_id},
                                           {"$set": {"status": "cancelled", "cancelled_by": user["user_id"],
                                                     "cancelled_at": datetime.now(timezone.utc).isoformat()}})
    if sched:
        await ws_manager.broadcast(sched["institution_id"], {
            "type": "interview.cancelled",
            "interview_id": interview_id,
            "ts": datetime.now(timezone.utc).isoformat(),
        })
    await _audit_log(
        "interview.cancelled",
        user=user,
        institution_id=sched.get("institution_id"),
        resource="interview_schedule",
        resource_id=interview_id,
        request=request,
    )
    return {"ok": True}


# ============== AI: INTERVIEW FEEDBACK ==============
@app.post("/api/interviews/{interview_id}/ai-feedback")
async def regenerate_ai_feedback(interview_id: str, request: Request, user=Depends(get_session_user)):
    report = await db.interview_reports.find_one({"interview_id": interview_id}, {"_id": 0})
    if not report:
        raise HTTPException(404, "interview report not found")
    if user["role"] in ("tpo", "institution_admin", "faculty"):
        require_same_institution(report.get("institution_id"), user)
    elif user["role"] != "super_admin" and user.get("student_id") != report["student_id"]:
        raise HTTPException(403, "forbidden")
    # Hydrate names if not present
    if not report.get("student_name"):
        s = await db.students.find_one({"student_id": report["student_id"]}, {"_id": 0})
        if s:
            report["student_name"] = s.get("name")
            report["roll_number"] = s.get("roll_number")
            report["department"] = s.get("department")
    result = await ai_interview_feedback(report)
    await db.interview_reports.update_one(
        {"interview_id": interview_id},
        {"$set": {"ai_feedback": result["feedback"], "ai_source": result["source"],
                  "ai_model": result.get("model"), "ai_generated_at": datetime.now(timezone.utc).isoformat()}},
    )
    await _audit_log(
        "interview.ai_feedback_generated",
        user=user,
        institution_id=report.get("institution_id"),
        resource="interview_report",
        resource_id=interview_id,
        metadata={"ai_source": result.get("source"), "ai_model": result.get("model")},
        request=request,
    )
    return result


# ============== AI: REAL RESUME ATS ==============
def _extract_pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
        from io import BytesIO
        reader = PdfReader(BytesIO(content))
        return "\n".join((page.extract_text() or "") for page in reader.pages)
    except Exception as exc:  # noqa: BLE001
        log.warning("PDF parse failed: %s", exc)
        return ""


@app.post("/api/ats/upload")
async def upload_resume(
    request: Request,
    file: UploadFile = File(...),
    job_description: str = Form(""),
    user=Depends(get_session_user),
):
    """Student (or staff on behalf of) uploads a PDF resume; we extract text and score it."""
    content = await file.read()
    size_kb = round(len(content) / 1024, 1)
    text = _extract_pdf_text(content)
    if not text and file.content_type and "text" in file.content_type:
        text = content.decode("utf-8", errors="ignore")
    scoring = await ai_ats_score(text, job_description)

    # Persist to GridFS for download
    gridfs_id = await gridfs.upload_from_stream(
        f"resume_{user['user_id']}_{file.filename}",
        content,
        metadata={"user_id": user["user_id"], "kind": "resume",
                  "uploaded_at": datetime.now(timezone.utc).isoformat()},
    )
    student_id = user.get("student_id")
    if not student_id and user["role"] != "student":
        # Allow TPO/Faculty to score on a target student via query param
        student_id = None
    record = {
        "ats_id": f"ats_{uuid.uuid4().hex[:10]}",
        "student_id": student_id,
        "user_id": user["user_id"],
        "institution_id": user.get("institution_id"),
        "score": scoring.get("ats_score"),
        "keyword_match_pct": scoring.get("keyword_match_pct"),
        "format_score": scoring.get("format_score"),
        "missing_keywords": scoring.get("missing_keywords", []),
        "strengths": scoring.get("strengths", []),
        "weaknesses": scoring.get("weaknesses", []),
        "verdict": scoring.get("verdict"),
        "ai_source": scoring.get("source", "fallback"),
        "ai_model": scoring.get("model"),
        "uploaded_filename": file.filename,
        "file_size_kb": size_kb,
        "gridfs_id": str(gridfs_id),
        "extracted_chars": len(text),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.ats_reports.insert_one(record)
    if student_id:
        previous_versions = await db.resume_versions.count_documents({"student_id": student_id})
        recruiter_match = round(
            ((record.get("score") or 0) * 0.48)
            + ((record.get("keyword_match_pct") or 0) * 0.34)
            + ((record.get("format_score") or 0) * 0.18),
            1,
        )
        await db.resume_versions.insert_one({
            "resume_id": f"res_{uuid.uuid4().hex[:10]}",
            "source_ats_id": record["ats_id"],
            "student_id": student_id,
            "institution_id": record.get("institution_id"),
            "version": previous_versions + 1,
            "upload_date": record["created_at"],
            "uploaded_filename": file.filename,
            "ats_score": record.get("score"),
            "keyword_score": record.get("keyword_match_pct"),
            "missing_keywords": record.get("missing_keywords", []),
            "recruiter_match_score": recruiter_match,
            "format_score": record.get("format_score"),
            "improvement_suggestions": [
                f"Add role-specific evidence for {keyword}"
                for keyword in (record.get("missing_keywords", []) or [])[:4]
            ],
            "created_at": record["created_at"],
        })
    record.pop("_id", None)
    await _audit_log(
        "ats.uploaded",
        user=user,
        institution_id=record.get("institution_id"),
        resource="ats_report",
        resource_id=record["ats_id"],
        metadata={"filename": file.filename, "score": record.get("score"), "size_kb": size_kb},
        request=request,
    )
    return record


@app.get("/api/ats/me/latest")
async def my_latest_ats(user=Depends(get_session_user)):
    sid = user.get("student_id")
    if not sid:
        return {"item": None}
    item = await db.ats_reports.find_one({"student_id": sid}, {"_id": 0}, sort=[("created_at", -1)])
    return {"item": item}


# ============== WEBSOCKET: LIVE UPDATES ==============
@app.websocket("/ws/live")
async def ws_live(websocket: WebSocket, institution_id: Optional[str] = None, token: Optional[str] = None):
    # Auth: verify session token (cookies aren't readable cross-domain by browser WS in many cases,
    # so we accept ?token= as query param too).
    if not token:
        token = websocket.cookies.get("session_token")
    if not token:
        await websocket.close(code=4401); return
    session_query = {"session_token": token}
    claims: Optional[dict] = None
    if token.count(".") == 2:
        try:
            claims = decode_access_token(token)
            session_query = {"jwt_id": claims["jti"]}
        except HTTPException:
            await websocket.close(code=4401); return
    sess = await db.user_sessions.find_one(session_query, {"_id": 0})
    if not sess:
        await websocket.close(code=4401); return
    user = await db.users.find_one({"user_id": claims["sub"] if claims else sess["user_id"]}, {"_id": 0, "password_hash": 0})
    if not user:
        await websocket.close(code=4401); return
    room = institution_id or user.get("institution_id") or "global"
    # super_admin can subscribe to any room they ask for; others scoped to their own institution
    if user["role"] != "super_admin" and room != user.get("institution_id"):
        await websocket.close(code=4403); return
    await ws_manager.connect(room, websocket)
    try:
        # Send a welcome packet so the client knows it's live
        await websocket.send_json({"type": "hello", "room": room,
                                   "user": user.get("name"), "role": user["role"],
                                   "ts": datetime.now(timezone.utc).isoformat()})
        while True:
            msg = await websocket.receive_text()
            # Echo keep-alives if needed
            if msg == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        pass
    finally:
        await ws_manager.disconnect(room, websocket)


# ============== MULTI-USER INVITES ==============
class InviteBody(BaseModel):
    email: EmailStr
    name: str
    role: Literal["tpo", "institution_admin", "faculty", "coordinator"] = "faculty"
    department: Optional[str] = None
    institution_id: Optional[str] = None  # super_admin can override


@app.post("/api/invite")
async def invite_user(
    body: InviteBody,
    request: Request,
    user=Depends(require_roles("super_admin", "tpo", "institution_admin")),
):
    iid = body.institution_id if user["role"] == "super_admin" else user.get("institution_id")
    if not iid:
        raise HTTPException(400, "institution_id required")
    existing = await db.users.find_one({"email": body.email.lower()})
    if existing:
        raise HTTPException(409, "User already exists")
    pw = DEFAULT_DEMO_PASSWORD  # auto-set; user changes after first login (out of scope)
    new = _new_user(email=body.email, name=body.name, role=body.role,
                    institution_id=iid, password=pw, approved=True, department=body.department)
    await db.users.insert_one(new)
    inst = await db.institutions.find_one({"institution_id": iid}, {"_id": 0}) or {}
    await notify(
        db, event="user_invited",
        to_email=body.email,
        subject=f"Welcome to CareerOS — {inst.get('name', 'your institution')}",
        title="You've been invited to CareerOS",
        body_html=(f"<p>Hi {body.name},</p>"
                   f"<p>{user['name']} has invited you to <b>{inst.get('name')}</b>'s placement command center as a <b>{body.role.replace('_', ' ')}</b>.</p>"
                   f"<p>Sign in at <a href='https://career-os-nexus.preview.emergentagent.com/login'>CareerOS</a> using:</p>"
                   f"<p><b>Email:</b> {body.email}<br/><b>Temporary password:</b> {pw}</p>"
                   f"<p>Please change your password after first login.</p>"),
        telegram_text=f"👥 New invite · {body.email} → {inst.get('short_name', iid)} · {body.role}",
    )
    await _audit_log(
        "user.invited",
        user=user,
        institution_id=iid,
        resource="user",
        resource_id=new["user_id"],
        metadata={"target_email": body.email.lower(), "target_role": body.role, "department": body.department},
        request=request,
    )
    return {"user_id": new["user_id"], "email": body.email, "temp_password": pw}


@app.get("/api/institution/users")
async def list_institution_users(user=Depends(require_roles("tpo", "institution_admin", "super_admin"))):
    iid = user.get("institution_id")
    if user["role"] == "super_admin":
        iid = iid or "inst_kmit"
    items = await db.users.find({"institution_id": iid}, {"_id": 0, "password_hash": 0}).to_list(200)
    return {"items": items}


@app.delete("/api/institution/users/{user_id}")
async def remove_institution_user(
    user_id: str,
    request: Request,
    user=Depends(require_roles("tpo", "institution_admin", "super_admin")),
):
    if user_id == user["user_id"]:
        raise HTTPException(400, "Cannot remove yourself")
    target = await db.users.find_one({"user_id": user_id})
    if not target:
        raise HTTPException(404, "not found")
    if user["role"] != "super_admin" and target.get("institution_id") != user.get("institution_id"):
        raise HTTPException(403, "forbidden")
    await db.users.delete_one({"user_id": user_id})
    await _audit_log(
        "user.removed",
        user=user,
        institution_id=target.get("institution_id"),
        resource="user",
        resource_id=user_id,
        metadata={"target_email": target.get("email"), "target_role": target.get("role")},
        request=request,
    )
    return {"ok": True}


@app.get("/{full_path:path}")
async def serve_frontend(full_path: str):
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="not found")
    index = FRONTEND_BUILD / "index.html"
    if not index.exists():
        raise HTTPException(status_code=404, detail="frontend build not found")
    return HTMLResponse(index.read_text(encoding="utf-8"), headers=SPA_HEADERS)
