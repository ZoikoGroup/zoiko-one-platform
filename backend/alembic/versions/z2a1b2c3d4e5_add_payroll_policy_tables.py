"""Add Payroll Policy Management tables + seed default policy per org

Revision ID: z2a1b2c3d4e5
Revises: 91a26d61893d
Create Date: 2026-07-21

Chained from merge head 91a26d61893d.
This migration is purely additive: 6 new tables, no changes to any existing
table (payroll_employees, payroll_runs, payslip_items, etc. are untouched).

NOTE: Revision ID renamed from z1a2b3c4d5e6 to z2a1b2c3d4e5 to resolve a
duplicate revision conflict with z1_merge_all_heads_final.py (which already
uses z1a2b3c4d5e6 as the established merge head).
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'z2a1b2c3d4e5'
down_revision = '91a26d61893d'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'payroll_policies',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False, index=True),
        sa.Column('name', sa.String(120), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.String(20), nullable=False, server_default='active'),
        sa.Column('effective_date', sa.Date(), nullable=False),
        sa.Column('is_default', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('calculation_mode', sa.String(20), nullable=False, server_default='standard'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index('ix_payroll_policies_org_status', 'payroll_policies', ['organization_id', 'status'])
    op.create_unique_constraint('uq_one_default_per_org', 'payroll_policies', ['organization_id', 'is_default'])

    op.create_table(
        'payroll_policy_employee_categories',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('policy_id', sa.Integer(), sa.ForeignKey('payroll_policies.id'), nullable=False, index=True),
        sa.Column('category', sa.String(20), nullable=False),
        sa.Column('working_days', sa.Integer(), nullable=False, server_default='5'),
        sa.Column('weekly_off', sa.JSON(), nullable=True),
        sa.Column('expected_hours', sa.Integer(), nullable=False, server_default='8'),
        sa.Column('minimum_hours', sa.Integer(), nullable=False, server_default='4'),
        sa.Column('paid_leave_eligible', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('grace_time_minutes', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('half_day_rule', sa.JSON(), nullable=True),
    )
    op.create_unique_constraint('uq_policy_category', 'payroll_policy_employee_categories', ['policy_id', 'category'])

    op.create_table(
        'payroll_policy_leave_rules',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('policy_id', sa.Integer(), sa.ForeignKey('payroll_policies.id'), nullable=False, index=True),
        sa.Column('rule_type', sa.String(20), nullable=False),
        sa.Column('config', sa.JSON(), nullable=True),
    )
    op.create_unique_constraint('uq_policy_leave_rule_type', 'payroll_policy_leave_rules', ['policy_id', 'rule_type'])

    op.create_table(
        'payroll_policy_overtime_rules',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('policy_id', sa.Integer(), sa.ForeignKey('payroll_policies.id'), nullable=False, unique=True, index=True),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('minimum_overtime_minutes', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('approval_required', sa.Boolean(), nullable=False, server_default='true'),
    )

    op.create_table(
        'payroll_policy_integrations',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('policy_id', sa.Integer(), sa.ForeignKey('payroll_policies.id'), nullable=False, index=True),
        sa.Column('category', sa.String(20), nullable=False),
        sa.Column('provider_key', sa.String(50), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.create_unique_constraint('uq_policy_integration', 'payroll_policy_integrations', ['policy_id', 'category', 'provider_key'])

    op.create_table(
        'payroll_policy_feature_flags',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('policy_id', sa.Integer(), sa.ForeignKey('payroll_policies.id'), nullable=False, index=True),
        sa.Column('flag_key', sa.String(40), nullable=False),
        sa.Column('enabled', sa.Boolean(), nullable=False, server_default='false'),
    )
    op.create_unique_constraint('uq_policy_feature_flag', 'payroll_policy_feature_flags', ['policy_id', 'flag_key'])

    # ── Seed one default policy per existing organization ──────────────────
    # Uses raw SQL (not the ORM) so this migration has no import dependency
    # on app code and stays runnable in isolation.
    conn = op.get_bind()
    org_ids = [row[0] for row in conn.execute(sa.text("SELECT id FROM organizations")).fetchall()]

    default_categories = [
        ('full_time', 5, 8, 4, True), ('part_time', 5, 4, 2, True),
        ('intern', 5, 8, 4, False),   # interns: paid_leave_eligible is ALWAYS False
        ('contract', 5, 8, 4, False), ('consultant', 5, 8, 0, False),
        ('freelancer', 0, 0, 0, False),
    ]
    default_integrations = [
        ('attendance', 'zoiko_time', True), ('attendance', 'manual_attendance', True),
        ('attendance', 'csv_import', True), ('attendance', 'biometric', False),
        ('banking', 'manual_transfer', True), ('banking', 'excel_export', True),
        ('banking', 'csv_export', True), ('banking', 'bank_api', False),
        ('accounting', 'excel_journal', True), ('accounting', 'csv_journal', True),
        ('accounting', 'zoho_books', False), ('accounting', 'quickbooks', False),
        ('accounting', 'erpnext', False), ('accounting', 'tally', False),
        ('notifications', 'email', True), ('notifications', 'sms', False),
        ('notifications', 'whatsapp', False), ('notifications', 'slack', False),
        ('notifications', 'teams', False),
        ('identity', 'zoiko_id', True), ('identity', 'google_workspace', False),
        ('identity', 'microsoft_entra', False),
    ]
    default_flags = {
        'attendance': True, 'leave': True, 'overtime': False, 'payroll': True,
        'accounting_export': True, 'bank_export': True, 'email': True,
        'tax': True, 'employer_contributions': True, 'notifications': True,
        'multi_currency': False, 'multi_jurisdiction': False,
    }

    for org_id in org_ids:
        policy_id = conn.execute(
            sa.text(
                "INSERT INTO payroll_policies "
                "(organization_id, name, description, status, effective_date, is_default, calculation_mode) "
                "VALUES (:org_id, 'Default Policy', "
                "'Auto-created default policy — matches pre-policy production behavior.', "
                "'active', CURRENT_DATE, true, 'standard') RETURNING id"
            ),
            {"org_id": org_id},
        ).scalar()

        for category, wd, eh, mh, paid in default_categories:
            conn.execute(
                sa.text(
                    "INSERT INTO payroll_policy_employee_categories "
                    "(policy_id, category, working_days, expected_hours, minimum_hours, paid_leave_eligible) "
                    "VALUES (:pid, :cat, :wd, :eh, :mh, :paid)"
                ),
                {"pid": policy_id, "cat": category, "wd": wd, "eh": eh, "mh": mh, "paid": paid},
            )

        conn.execute(
            sa.text(
                "INSERT INTO payroll_policy_overtime_rules (policy_id, enabled, minimum_overtime_minutes, approval_required) "
                "VALUES (:pid, false, 30, true)"
            ),
            {"pid": policy_id},
        )

        for category, provider_key, enabled in default_integrations:
            conn.execute(
                sa.text(
                    "INSERT INTO payroll_policy_integrations (policy_id, category, provider_key, enabled) "
                    "VALUES (:pid, :cat, :pk, :en)"
                ),
                {"pid": policy_id, "cat": category, "pk": provider_key, "en": enabled},
            )

        for flag_key, enabled in default_flags.items():
            conn.execute(
                sa.text("INSERT INTO payroll_policy_feature_flags (policy_id, flag_key, enabled) VALUES (:pid, :fk, :en)"),
                {"pid": policy_id, "fk": flag_key, "en": enabled},
            )


def downgrade():
    op.drop_table('payroll_policy_feature_flags')
    op.drop_table('payroll_policy_integrations')
    op.drop_table('payroll_policy_overtime_rules')
    op.drop_table('payroll_policy_leave_rules')
    op.drop_table('payroll_policy_employee_categories')
    op.drop_table('payroll_policies')