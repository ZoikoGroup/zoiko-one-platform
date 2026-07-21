# Migration Fix TODO

## Problem
DB has orphaned revision `p1b_sub_prov` (file missing) + duplicate revision `d1e2f3a4b5c6` (two files) → all 16 code columns missing → `Column employees.legacy_code does not exist` error

## Steps

### ✅ 1. Fix duplicate `d1e2f3a4b5c6` 
- Rename `d1e2f3a4b5c6` → `d1e2f3a4b5d0` in `d1e2f3a4b5c6_drop_obsolete_auto_refresh_exchange_rates.py`
- Update the file's `revision` and `down_revision` references

### ☐ 2. Create stub `p1b_sub_prov.py`
- No-op migration with `revision = "p1b_sub_prov"`, `down_revision = "p1a_price_provenance_foundation"`

### ☐ 3. Create merge migration
- Merge heads `b2c1d0e9f8a7` and `d1e2f3a4b5d0`

### ☐ 4. Run `alembic upgrade head`
- This applies `b2c1d0e9f8a7_add_enterprise_tenant_code_system.py` (all 16 columns)

### ☐ 5. Verify
- `employees.legacy_code` exists
- All 16 code columns across all tables exist
- `GET /hr/organization` returns 200 (not 500)

