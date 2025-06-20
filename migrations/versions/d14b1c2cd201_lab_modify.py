""" Lab modify 

Revision ID: d14b1c2cd201
Revises: 66c36fa816d2
Create Date: 2025-06-17 23:12:36.407208

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'd14b1c2cd201'
down_revision = '66c36fa816d2'
branch_labels = None
depends_on = None


def upgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    op.add_column('lab', sa.Column('lab_type', sa.String(length=50), nullable=True))
    op.add_column('lab', sa.Column('grade', sa.String(length=10), nullable=True))
    op.add_column('lab', sa.Column('section', sa.String(length=10), nullable=True))
    op.add_column('lab', sa.Column('subject', sa.String(length=100), nullable=True))

    op.create_index(op.f('ix_lab_lab_type'), 'lab', ['lab_type'], unique=False)
    op.create_index(op.f('ix_lab_name'), 'lab', ['name'], unique=True)
    

def downgrade():
    # ### commands auto generated by Alembic - please adjust! ###
    
    op.drop_index(op.f('ix_lab_name'), table_name='lab')
    op.drop_index(op.f('ix_lab_lab_type'), table_name='lab')
    op.drop_column('lab', 'subject')
    op.drop_column('lab', 'section')
    op.drop_column('lab', 'grade')
    op.drop_column('lab', 'lab_type')
    # ### end Alembic commands ###
