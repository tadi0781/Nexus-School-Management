"""change grade to int 

Revision ID: 66c36fa816d2
Revises: 7711b70ae17b
Create Date: 2025-06-16 19:33:15.977040

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


# revision identifiers, used by Alembic.
revision = '66c36fa816d2'
down_revision = '7711b70ae17b'
branch_labels = None
depends_on = None


def upgrade():
    conn = op.get_bind()
    
    # First clean the data - set non-numeric values to NULL
    conn.execute(text("""
        UPDATE teacher_profile 
        SET grade = NULL 
        WHERE grade !~ '^\\d+$' OR grade IS NULL OR grade = ''
    """))
    
    conn.execute(text("""
        UPDATE teacher_profile 
        SET section = NULL 
        WHERE section !~ '^\\d+$' OR section IS NULL OR section = ''
    """))
    
    conn.execute(text("""
        UPDATE "user" 
        SET grade = NULL 
        WHERE grade !~ '^\\d+$' OR grade IS NULL OR grade = ''
    """))
    
    conn.execute(text("""
        UPDATE "user" 
        SET section = NULL 
        WHERE section !~ '^\\d+$' OR section IS NULL OR section = ''
    """))
    
    # Then alter the columns with proper casting
    op.alter_column('teacher_profile', 'grade',
               existing_type=sa.VARCHAR(length=10),
               type_=sa.Integer(),
               existing_nullable=True,
               postgresql_using='grade::integer')
    
    op.alter_column('teacher_profile', 'section',
               existing_type=sa.VARCHAR(),
               type_=sa.Integer(),
               existing_nullable=True,
               postgresql_using='section::integer')
    
    op.alter_column('user', 'grade',
               existing_type=sa.VARCHAR(length=10),
               type_=sa.Integer(),
               existing_nullable=True,
               postgresql_using='grade::integer')
    
    op.alter_column('user', 'section',
               existing_type=sa.VARCHAR(length=10),
               type_=sa.Integer(),
               existing_nullable=True,
               postgresql_using='section::integer')


def downgrade():
    op.alter_column('user', 'section',
               existing_type=sa.Integer(),
               type_=sa.VARCHAR(length=10),
               existing_nullable=True)
    
    op.alter_column('user', 'grade',
               existing_type=sa.Integer(),
               type_=sa.VARCHAR(length=10),
               existing_nullable=True)
    
    op.alter_column('teacher_profile', 'section',
               existing_type=sa.Integer(),
               type_=sa.VARCHAR(),
               existing_nullable=True)
    
    op.alter_column('teacher_profile', 'grade',
               existing_type=sa.Integer(),
               type_=sa.VARCHAR(length=10),
               existing_nullable=True)