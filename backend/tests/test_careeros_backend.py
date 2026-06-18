"""CareerOS backend integration tests — full coverage of seeded flows."""
import os
import io
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
if not BASE_URL:
    # Fallback: read frontend .env
    try:
        with open("/app/frontend/.env") as f:
            for line in f:
                if line.startswith("REACT_APP_BACKEND_URL="):
                    BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
    except Exception:
        pass


def _login(email: str) -> requests.Session:
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/dev-login", json={"email": email}, timeout=15)
    assert r.status_code == 200, f"dev-login {email} -> {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="module")
def tpo_session():
    return _login("tpo@kmit.in")


@pytest.fixture(scope="module")
def admin_session():
    return _login("admin@careeros.app")


@pytest.fixture(scope="module")
def vasavi_session():
    return _login("tpo@vasavi.ac.in")


# ---------------- Health & public ----------------
def test_health():
    r = requests.get(f"{BASE_URL}/api/health", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_public_landing_stats():
    r = requests.get(f"{BASE_URL}/api/public/landing-stats", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "years" in data and len(data["years"]) >= 5
    companies = {x["company"] for x in data["top_recruiters"]}
    assert {"Amazon", "Google", "Microsoft"}.issubset(companies)


# ---------------- Auth ----------------
def test_dev_login_sets_cookie():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/dev-login", json={"email": "tpo@kmit.in"}, timeout=10)
    assert r.status_code == 200
    assert "session_token" in s.cookies.get_dict()
    body = r.json()
    assert body["user"]["email"] == "tpo@kmit.in"


def test_auth_me_tpo(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 200
    me = r.json()
    assert me["role"] == "tpo"
    assert me["approved"] is True


def test_auth_me_vasavi_pending(vasavi_session):
    r = vasavi_session.get(f"{BASE_URL}/api/auth/me", timeout=10)
    assert r.status_code == 200
    assert r.json()["approved"] is False


def test_dev_login_unknown_email():
    r = requests.post(f"{BASE_URL}/api/auth/dev-login", json={"email": "tpo@newcollege.com"}, timeout=10)
    assert r.status_code == 404


# ---------------- Placements ----------------
def test_placements_overview(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/placements/overview", timeout=15)
    assert r.status_code == 200
    data = r.json()
    years = {y["academic_year"]: y for y in data["year_summaries"]}
    assert "2025-26" in years
    y = years["2025-26"]
    assert y["companies"] == 148 and y["offers"] == 702
    assert abs(y["avg_lpa"] - 8.26) < 0.01
    depts = {d["department"] for d in data["department_breakdown"]}
    assert {"CSE", "IT", "CSE-AIML", "CSE-DS"}.issubset(depts)
    companies = {r["company"] for r in data["top_recruiters"]}
    assert companies & {"Amazon", "Google", "Microsoft", "TCS"}


# ---------------- Students ----------------
def test_students_list(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/students", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["count"] >= 80


def test_students_filter_department(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/students?department=CSE", timeout=10)
    assert r.status_code == 200
    items = r.json()["items"]
    assert items and all(s["department"] == "CSE" for s in items)


def test_students_search(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/students?q=Reddy", timeout=10)
    assert r.status_code == 200
    assert r.json()["count"] >= 1


def test_students_create(tpo_session):
    before = tpo_session.get(f"{BASE_URL}/api/students?limit=1000", timeout=10).json()["count"]
    payload = {
        "name": "TEST_Student Bot",
        "roll_number": "TESTROLL001",
        "department": "CSE",
        "email": "test_bot@kmit.in",
    }
    r = tpo_session.post(f"{BASE_URL}/api/students", json=payload, timeout=10)
    assert r.status_code == 200
    sid = r.json()["student_id"]
    after = tpo_session.get(f"{BASE_URL}/api/students?limit=1000", timeout=10).json()["count"]
    assert after == before + 1
    g = tpo_session.get(f"{BASE_URL}/api/students/{sid}", timeout=10)
    assert g.status_code == 200
    assert g.json()["student"]["name"] == "TEST_Student Bot"


# ---------------- Cohorts ----------------
def test_cohorts(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/cohorts", timeout=10)
    assert r.status_code == 200
    items = r.json()["items"]
    codes = {c["program_code"] for c in items}
    assert {"CRT", "IM", "FDP", "DSA", "APT"}.issubset(codes)
    for c in items:
        assert "completion_pct" in c


# ---------------- Training completion ----------------
def test_training_completion(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/training/completion", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert len(data["by_program"]) == 5
    assert data["rows"], "rows should be non-empty"
    row = data["rows"][0]
    assert "student_name" in row and "completion_pct" in row


# ---------------- MOU ----------------
def test_mou_get(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/mou", timeout=10)
    assert r.status_code == 200
    m = r.json()
    assert isinstance(m["days_until_renewal"], int) and m["days_until_renewal"] > 0
    assert m["document_name"] == "Skill-Tank-KMIT-MOU-2024.pdf"


def test_mou_upload(tpo_session):
    files = {"file": ("test_mou.pdf", io.BytesIO(b"%PDF-test-content" * 50), "application/pdf")}
    data = {"expires_on": "2027-01-01T00:00:00+00:00", "partnership_type": "CRT"}
    r = tpo_session.post(f"{BASE_URL}/api/mou/upload", files=files, data=data, timeout=20)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["ok"] is True
    assert body["size_kb"] > 0


# ---------------- College ----------------
def test_get_college(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/college/col_kmit_main", timeout=10)
    assert r.status_code == 200
    assert r.json()["name"] == "Keshav Memorial Institute of Technology"


def test_patch_college(tpo_session):
    r = tpo_session.patch(f"{BASE_URL}/api/college/col_kmit_main", json={"city": "Hyderabad-Updated"}, timeout=10)
    assert r.status_code == 200
    g = tpo_session.get(f"{BASE_URL}/api/college/col_kmit_main", timeout=10).json()
    assert g["city"] == "Hyderabad-Updated"
    # Restore
    tpo_session.patch(f"{BASE_URL}/api/college/col_kmit_main", json={"city": "Hyderabad"}, timeout=10)


def test_cross_college_denied(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/college/col_vasavi_pending", timeout=10)
    assert r.status_code == 403


# ---------------- Admin ----------------
def test_admin_endpoints_require_super_admin(tpo_session):
    r = tpo_session.get(f"{BASE_URL}/api/admin/pending-signups", timeout=10)
    assert r.status_code == 403


def test_admin_pending_signups(admin_session):
    r = admin_session.get(f"{BASE_URL}/api/admin/pending-signups", timeout=10)
    assert r.status_code == 200
    emails = {u["email"] for u in r.json()["items"]}
    assert "tpo@vasavi.ac.in" in emails


def test_admin_approve_and_verify(admin_session):
    pending = admin_session.get(f"{BASE_URL}/api/admin/pending-signups", timeout=10).json()["items"]
    target = next((u for u in pending if u["email"] == "tpo@vasavi.ac.in"), None)
    assert target, "Vasavi not in pending"
    r = admin_session.post(f"{BASE_URL}/api/admin/approve/{target['user_id']}", timeout=10)
    assert r.status_code == 200
    # Re-login as Vasavi and verify approved
    s = _login("tpo@vasavi.ac.in")
    me = s.get(f"{BASE_URL}/api/auth/me", timeout=10).json()
    assert me["approved"] is True


def test_test_notification_and_log(admin_session):
    r = admin_session.post(f"{BASE_URL}/api/admin/test-notification", timeout=15)
    assert r.status_code == 200
    log = admin_session.get(f"{BASE_URL}/api/admin/notifications", timeout=10).json()
    items = log["items"]
    assert items, "notification log should have entries"
    channels = {i["channel"] for i in items[:10]}
    assert {"email", "telegram"}.issubset(channels)
