"""add monthly plan dates and cancellation state

Revision ID: d1b8a4c6e2f0
Revises: a3d4c6e8f101
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d1b8a4c6e2f0"
down_revision: Union[str, None] = "a3d4c6e8f101"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("plan_started_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("users", sa.Column("plan_expires_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "users",
        sa.Column("plan_cancel_at_period_end", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    # Give existing manually assigned paid plans one monthly period from migration time.
    op.execute(
        "UPDATE users SET plan_started_at = CURRENT_TIMESTAMP, "
        "plan_expires_at = CURRENT_TIMESTAMP + INTERVAL '1 month' "
        "WHERE plan IN ('pro', 'team') AND plan_expires_at IS NULL"
    )


def downgrade() -> None:
    op.drop_column("users", "plan_cancel_at_period_end")
    op.drop_column("users", "plan_expires_at")
    op.drop_column("users", "plan_started_at")
