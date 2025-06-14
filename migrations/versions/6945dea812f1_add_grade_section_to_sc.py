"""add grade section to sc

Revision ID: 6945dea812f1
Revises: 3e6ac66388f2
Create Date: 2025-06-15 00:16:00.120479

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '6945dea812f1'
down_revision = '3e6ac66388f2'
branch_labels = None
depends_on = None


def upgrade():
    """Add grade and section columns to the secret_code table."""
    op.add_column('secret_code', sa.Column('grade', sa.String(length=10), nullable=True))
    op.add_column('secret_code', sa.Column('section', sa.String(length=10), nullable=True))


def downgrade():
    """Remove grade and section columns from the secret_code table."""
    op.drop_column('secret_code', 'section')
    op.drop_column('secret_code', 'grade')