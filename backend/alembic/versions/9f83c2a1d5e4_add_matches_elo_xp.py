"""add matches, elo, xp, achievements

Revision ID: 9f83c2a1d5e4
Revises: 6ffc464b2751
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "9f83c2a1d5e4"
down_revision: Union[str, None] = "6ffc464b2751"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("elo", sa.Integer(), server_default="1000", nullable=False))
    op.add_column("users", sa.Column("xp", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("level", sa.Integer(), server_default="1", nullable=False))
    op.add_column("users", sa.Column("matches_played", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("matches_won", sa.Integer(), server_default="0", nullable=False))
    op.add_column("users", sa.Column("plan", sa.String(length=20), server_default="free", nullable=False))
    op.create_table("matches",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("room_id", sa.String(length=20), nullable=False),
        sa.Column("started_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("finished_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("winner_id", sa.UUID(), nullable=True),
        sa.Column("player_count", sa.Integer(), nullable=False),
        sa.Column("race_text_length", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["winner_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_matches_room_id", "matches", ["room_id"], unique=False)
    op.create_table("match_participants",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("match_id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=True), sa.Column("username", sa.String(length=50), nullable=False),
        sa.Column("position", sa.Integer(), nullable=True), sa.Column("wpm", sa.Float(), nullable=False),
        sa.Column("accuracy", sa.Float(), nullable=False), sa.Column("finished", sa.Boolean(), nullable=False),
        sa.Column("left_race", sa.Boolean(), nullable=False), sa.Column("elo_before", sa.Integer(), nullable=True),
        sa.Column("elo_after", sa.Integer(), nullable=True), sa.Column("elo_delta", sa.Integer(), nullable=True),
        sa.Column("xp_earned", sa.Integer(), nullable=True),
        sa.ForeignKeyConstraint(["match_id"], ["matches.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"))
    op.create_index("ix_match_participants_match_id", "match_participants", ["match_id"], unique=False)
    op.create_index("ix_match_participants_user_id", "match_participants", ["user_id"], unique=False)
    op.create_table("achievements",
        sa.Column("id", sa.UUID(), nullable=False), sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("code", sa.String(length=40), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"), sa.UniqueConstraint("user_id", "code", name="uq_achievement_user_code"))
    op.create_index("ix_achievements_user_id", "achievements", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_achievements_user_id", table_name="achievements")
    op.drop_table("achievements")
    op.drop_index("ix_match_participants_user_id", table_name="match_participants")
    op.drop_index("ix_match_participants_match_id", table_name="match_participants")
    op.drop_table("match_participants")
    op.drop_index("ix_matches_room_id", table_name="matches")
    op.drop_table("matches")
    for column in ("plan", "matches_won", "matches_played", "level", "xp", "elo"):
        op.drop_column("users", column)
