"""
Regression test for the duplicate-holiday bug: the frontend Holidays tab
used to merge a hardcoded default list with a separate localStorage list
with no de-dup, so the same real-world holiday (e.g. Republic Day) could
show up twice. Fixed by routing both through bulk_upsert_holidays, which
upserts by (organization_id, date) instead of always inserting.
"""

from datetime import date

from app.modules.payroll.service import bulk_upsert_holidays, list_holidays


def test_upserting_the_same_date_twice_does_not_duplicate(db):
    org_id = 1

    bulk_upsert_holidays(db, org_id, [{"date": date(2031, 1, 26), "name": "Republic Day"}])
    bulk_upsert_holidays(db, org_id, [{"date": date(2031, 1, 26), "name": "Republic Day"}])

    rows = list_holidays(db, org_id, year=2031)
    matching = [r for r in rows if r.date == date(2031, 1, 26)]
    assert len(matching) == 1
    assert matching[0].name == "Republic Day"


def test_upserting_same_date_with_different_name_updates_not_duplicates(db):
    org_id = 1

    bulk_upsert_holidays(db, org_id, [{"date": date(2031, 3, 3), "name": "Holi"}])
    bulk_upsert_holidays(db, org_id, [{"date": date(2031, 3, 3), "name": "Holi Festival"}])

    rows = list_holidays(db, org_id, year=2031)
    matching = [r for r in rows if r.date == date(2031, 3, 3)]
    assert len(matching) == 1
    assert matching[0].name == "Holi Festival"
