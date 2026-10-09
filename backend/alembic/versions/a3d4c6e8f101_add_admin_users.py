"""add admin flag to users

Revision ID: a3d4c6e8f101
Revises: 9f83c2a1d5e4
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "a3d4c6e8f101"
down_revision: Union[str, None] = "9f83c2a1d5e4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("is_admin", sa.Boolean(), server_default=sa.false(), nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "is_admin")
