"""Tests for organization-scoped employee ID prefix generation.

Covers:
- Prefix derivation from org names (2-letter, 1-char pad, non-alpha, empty)
- Independent serial numbering for two orgs sharing the same 2-letter prefix
- Substring-offset correctness (dynamic offset by prefix length)
- Concurrent employee creation safety via pg_advisory_xact_lock
- Historical EMP#### IDs remain untouched after the prefix change
"""

import re
import threading
import pytest
from sqlalchemy.orm import Session

from app.modules.hr.models import Organization, OrganizationStatus, Department
from app.modules.employee.models import (
    Employee, EmployeeStatus, EmploymentType, UserRole,
)
from app.modules.employee.service import (
    derive_employee_id_prefix,
    _generate_employee_id,
)
from app.core.security import hash_password
from datetime import date


# ── Helpers ─────────────────────────────────────────────────────────────────

def _create_org(db: Session, name: str, code: str) -> Organization:
    org = Organization(
        name=name,
        code=code,
        status=OrganizationStatus.ACTIVE,
        employee_id_prefix=derive_employee_id_prefix(name),
    )
    db.add(org)
    db.flush()
    db.refresh(org)
    return org


def _create_dept(db: Session, name: str, code: str, org_id: int) -> Department:
    dept = Department(name=name, code=code, organization_id=org_id)
    db.add(dept)
    db.flush()
    db.refresh(dept)
    return dept


def _create_employee_raw(
    db: Session, org_id: int, emp_id: str, email: str,
    dept_id: int,
) -> Employee:
    """Insert an employee with a pre-set employee_id (for historical-ID tests)."""
    emp = Employee(
        email=email,
        hashed_password=hash_password("test1234"),
        role=UserRole.EMPLOYEE,
        is_active=True,
        first_name="Test",
        last_name="User",
        phone="0000000000",
        employee_code=f"ZK-{email[:8]}",
        employee_id=emp_id,
        job_title="Tester",
        employment_type=EmploymentType.FULL_TIME,
        status=EmployeeStatus.ACTIVE,
        date_of_joining=date(2024, 1, 1),
        department_id=dept_id,
        organization_id=org_id,
    )
    db.add(emp)
    db.flush()
    db.refresh(emp)
    return emp


# ═══════════════════════════════════════════════════════════════════════════════
# 1. Prefix derivation
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeriveEmployeeIdPrefix:
    """Unit tests for the derive_employee_id_prefix() pure function."""

    def test_two_word_name(self):
        assert derive_employee_id_prefix("Zoiko Inc") == "ZO"

    def test_two_word_name_exact(self):
        assert derive_employee_id_prefix("Acme Corp") == "AC"

    def test_single_word(self):
        assert derive_employee_id_prefix("Globex") == "GL"

    def test_one_alpha_char_padded(self):
        assert derive_employee_id_prefix("A1") == "AX"

    def test_one_alpha_char_only(self):
        # "1" has 0 alpha chars → falls back to "OR"
        assert derive_employee_id_prefix("1") == "OR"

    def test_no_alpha_chars(self):
        assert derive_employee_id_prefix("12345") == "OR"

    def test_empty_string(self):
        assert derive_employee_id_prefix("") == "OR"

    def test_none_input(self):
        assert derive_employee_id_prefix(None) == "OR"

    def test_mixed_alphanumeric(self):
        # "Zo1ko2" → alpha chars "Zoko" → "ZO"
        assert derive_employee_id_prefix("Zo1ko2") == "ZO"

    def test_special_characters_only(self):
        assert derive_employee_id_prefix("!!!@@@###") == "OR"

    def test_long_name_takes_two(self):
        assert derive_employee_id_prefix("Microsoft Corporation") == "MI"

    def test_lowercase_input(self):
        assert derive_employee_id_prefix("zoiko inc") == "ZO"

    def test_padded_with_x(self):
        # "A" → "AX"
        assert derive_employee_id_prefix("A") == "AX"
        # "B-2000" → alpha "B" → "BX"
        assert derive_employee_id_prefix("B-2000") == "BX"


# ═══════════════════════════════════════════════════════════════════════════════
# 2. Two orgs with same 2-letter prefix generate IDs independently
# ═══════════════════════════════════════════════════════════════════════════════

class TestIndependentSerialNumbering:
    """Two orgs whose names produce the same prefix get independent sequences."""

    def test_same_prefix_sequential(self, db: Session):
        org_a = _create_org(db, "Zoiko Alpha", "ZA")
        org_b = _create_org(db, "Zoiko Beta", "ZB")
        dept_a = _create_dept(db, "Eng A", "EA", org_a.id)
        dept_b = _create_dept(db, "Eng B", "EB", org_b.id)

        assert org_a.employee_id_prefix == "ZO"
        assert org_b.employee_id_prefix == "ZO"

        id_a1 = _generate_employee_id(db, org_a.id)
        id_b1 = _generate_employee_id(db, org_b.id)
        id_a2 = _generate_employee_id(db, org_a.id)
        id_b2 = _generate_employee_id(db, org_b.id)

        assert id_a1 == "ZO0001"
        assert id_b1 == "ZO0001"
        assert id_a2 == "ZO0002"
        assert id_b2 == "ZO0002"

    def test_different_prefixes(self, db: Session):
        org_a = _create_org(db, "Zoiko Inc", "ZI")
        org_b = _create_org(db, "Acme Corp", "AC")
        dept_a = _create_dept(db, "Eng A", "EA", org_a.id)
        dept_b = _create_dept(db, "Eng B", "EB", org_b.id)

        id_a = _generate_employee_id(db, org_a.id)
        id_b = _generate_employee_id(db, org_b.id)

        assert id_a == "ZO0001"
        assert id_b == "AC0001"


# ═══════════════════════════════════════════════════════════════════════════════
# 3. Edge-case org names produce valid prefixes
# ═══════════════════════════════════════════════════════════════════════════════

class TestEdgeCasePrefixes:
    """Orgs with unusual names generate correct employee IDs."""

    def test_single_char_name(self, db: Session):
        org = _create_org(db, "X", "XC")
        dept = _create_dept(db, "Gen", "GEN", org.id)
        assert org.employee_id_prefix == "XX"
        eid = _generate_employee_id(db, org.id)
        assert eid == "XX0001"

    def test_numbers_only_name(self, db: Session):
        org = _create_org(db, "123", "NUM")
        dept = _create_dept(db, "Gen", "GEN", org.id)
        assert org.employee_id_prefix == "OR"
        eid = _generate_employee_id(db, org.id)
        assert eid == "OR0001"

    def test_special_chars_only(self, db: Session):
        org = _create_org(db, "!@#", "SYM")
        dept = _create_dept(db, "Gen", "GEN", org.id)
        assert org.employee_id_prefix == "OR"
        eid = _generate_employee_id(db, org.id)
        assert eid == "OR0001"

    def test_non_alpha_starting_name(self, db: Session):
        org = _create_org(db, "3M Company", "3M")
        dept = _create_dept(db, "Gen", "GEN", org.id)
        # alpha chars: "MCompany" → "MC"
        assert org.employee_id_prefix == "MC"
        eid = _generate_employee_id(db, org.id)
        assert eid == "MC0001"


# ═══════════════════════════════════════════════════════════════════════════════
# 4. Concurrent employee creation does not produce duplicate IDs
# ═══════════════════════════════════════════════════════════════════════════════

class TestConcurrentIdGeneration:
    """Simulate parallel employee creation via _generate_employee_id within one org.

    Each thread opens its own DB connection and session so threads genuinely
    compete for ``pg_advisory_xact_lock``.  Results are collected and
    checked for zero duplicates.
    """

    NUM_THREADS = 4
    IDS_PER_THREAD = 5

    def test_no_duplicates_under_contention(self):
        from tests.conftest import test_engine, TestSessionLocal

        # Seed the org and department in a dedicated session so all threads
        # see consistent data.
        setup_conn = test_engine.connect()
        setup_txn = setup_conn.begin()
        setup_session = TestSessionLocal(bind=setup_conn)
        try:
            org = _create_org(setup_session, "Concurrency Corp", "CC")
            _create_dept(setup_session, "Eng", "ENG", org.id)
            setup_txn.commit()
            org_id = org.id
        finally:
            setup_session.close()
            setup_txn.close()
            setup_conn.close()

        results = []
        errors = []
        lock = threading.Lock()

        def worker():
            conn = test_engine.connect()
            txn = conn.begin()
            session = TestSessionLocal(bind=conn)
            try:
                thread_ids = []
                for _ in range(self.IDS_PER_THREAD):
                    eid = _generate_employee_id(session, org_id)
                    thread_ids.append(eid)
                txn.commit()
                with lock:
                    results.extend(thread_ids)
            except Exception as e:
                txn.rollback()
                with lock:
                    errors.append(str(e))
            finally:
                session.close()
                conn.close()

        threads = [threading.Thread(target=worker) for _ in range(self.NUM_THREADS)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()

        assert not errors, f"Errors in threads: {errors}"
        expected_count = self.NUM_THREADS * self.IDS_PER_THREAD
        assert len(results) == expected_count
        assert len(set(results)) == expected_count, (
            f"Duplicate IDs found: {[eid for eid in results if results.count(eid) > 1]}"
        )
        for eid in results:
            assert eid.startswith("CC"), f"Unexpected prefix in {eid}"
        numbers = sorted(int(eid[2:]) for eid in results)
        assert numbers == list(range(1, expected_count + 1))


# ═══════════════════════════════════════════════════════════════════════════════
# 5. Substring offset is dynamic based on prefix length
# ═══════════════════════════════════════════════════════════════════════════════

class TestSubstringOffsetLiteral:
    """Verify the serial offset math uses the actual prefix length."""

    def test_existing_ids_seed_next_number(self, db: Session):
        org = _create_org(db, "Zoiko Test", "ZT")
        dept = _create_dept(db, "Eng", "ENG", org.id)

        # Seed two existing employees with the org prefix
        _create_employee_raw(db, org.id, "ZO0001", "z1@test.com", dept.id)
        _create_employee_raw(db, org.id, "ZO0002", "z2@test.com", dept.id)

        # Next generated ID must be ZO0003
        eid = _generate_employee_id(db, org.id)
        assert eid == "ZO0003"

    def test_different_prefix_length(self, db: Session):
        org = _create_org(db, "A", "AX")  # prefix = "AX"
        dept = _create_dept(db, "Gen", "GEN", org.id)

        _create_employee_raw(db, org.id, "AX0001", "ax1@test.com", dept.id)

        # prefix_len=2, substring starts at position 3
        eid = _generate_employee_id(db, org.id)
        assert eid == "AX0002"

    def test_three_letter_prefix_edge(self, db: Session):
        """If prefix derivation ever changes to produce 3+ chars, substring adapts."""
        org = _create_org(db, "Zoiko Test", "ZT")
        dept = _create_dept(db, "Eng", "ENG", org.id)

        # Manually set a 3-char prefix to simulate a future scenario
        org.employee_id_prefix = "ZOT"
        db.flush()

        _create_employee_raw(db, org.id, "ZOT0001", "zot1@test.com", dept.id)
        _create_employee_raw(db, org.id, "ZOT0050", "zot2@test.com", dept.id)

        eid = _generate_employee_id(db, org.id)
        assert eid == "ZOT0051"


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Historical EMP#### IDs are untouched
# ═══════════════════════════════════════════════════════════════════════════════

class TestHistoricalIdsUntouched:
    """Employees created before the prefix change keep their EMP#### IDs.

    After the migration backfills ``employee_id_prefix`` on existing orgs,
    those orgs will have a prefix like "ZO" (from their name).  The
    ``_generate_employee_id()`` function filters by ``LIKE '<prefix>%'``,
    so old EMP-prefixed IDs are not matched, and new IDs start from 0001
    under the new prefix.
    """

    def test_existing_emp_ids_not_overwritten(self, db: Session):
        org = _create_org(db, "Legacy Org", "LEG")
        dept = _create_dept(db, "Gen", "GEN", org.id)

        # Simulate employees created before the prefix change
        emp1 = _create_employee_raw(db, org.id, "EMP0001", "emp1@legacy.com", dept.id)
        emp2 = _create_employee_raw(db, org.id, "EMP0002", "emp2@legacy.com", dept.id)
        emp3 = _create_employee_raw(db, org.id, "EMP0010", "emp3@legacy.com", dept.id)

        # Historical IDs should remain as-is
        assert emp1.employee_id == "EMP0001"
        assert emp2.employee_id == "EMP0002"
        assert emp3.employee_id == "EMP0010"

        # New ID generation should use the org prefix "LE", not "EMP"
        new_id = _generate_employee_id(db, org.id)
        assert new_id == "LE0001"

        # Another new ID should be LE0002
        new_id2 = _generate_employee_id(db, org.id)
        assert new_id2 == "LE0002"

    def test_emp_ids_in_other_orgs_not_matched(self, db: Session):
        """Org A has EMP0001, Org B generates from its own prefix."""
        org_a = _create_org(db, "Org Alpha", "OA")
        org_b = _create_org(db, "Org Beta", "OB")
        dept_a = _create_dept(db, "Eng A", "EA", org_a.id)
        dept_b = _create_dept(db, "Eng B", "EB", org_b.id)

        # Org A has old EMP IDs
        _create_employee_raw(db, org_a.id, "EMP0001", "e1@alpha.com", dept_a.id)
        _create_employee_raw(db, org_a.id, "EMP0005", "e2@alpha.com", dept_a.id)

        # Org B starts fresh with its prefix
        id_b1 = _generate_employee_id(db, org_b.id)
        id_b2 = _generate_employee_id(db, org_b.id)
        assert id_b1 == "OB0001"
        assert id_b2 == "OB0002"

        # Org A new employees get OA prefix, independent of old EMP IDs
        id_a1 = _generate_employee_id(db, org_a.id)
        assert id_a1 == "OA0001"


# ═══════════════════════════════════════════════════════════════════════════════
# 6. Missing prefix raises clear error
# ═══════════════════════════════════════════════════════════════════════════════

class TestMissingPrefixError:
    """Organizations without employee_id_prefix raise a clear error."""

    def test_missing_prefix_raises(self, db: Session):
        org = Organization(
            name="No Prefix Org",
            code="NP",
            status=OrganizationStatus.ACTIVE,
            # employee_id_prefix intentionally omitted (None)
        )
        db.add(org)
        db.flush()

        with pytest.raises(Exception, match="missing employee_id_prefix"):
            _generate_employee_id(db, org.id)

    def test_nonexistent_org_raises(self, db: Session):
        with pytest.raises(Exception, match="not found"):
            _generate_employee_id(db, 99999)
