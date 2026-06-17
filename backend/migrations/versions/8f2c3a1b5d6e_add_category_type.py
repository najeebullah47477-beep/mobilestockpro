"""add category_type to categories

Revision ID: 8f2c3a1b5d6e
Revises: 4a44d5c16767
Create Date: 2026-06-05 10:30:00.000000
"""
from alembic import op
import sqlalchemy as sa


revision = '8f2c3a1b5d6e'
down_revision = '4a44d5c16767'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('categories', sa.Column('category_type', sa.String(length=20), nullable=True, server_default='accessory'))
    op.execute("UPDATE categories SET category_type = 'accessory' WHERE category_type IS NULL")
    op.alter_column('categories', 'category_type', existing_type=sa.String(length=20), nullable=False)


def downgrade():
    op.drop_column('categories', 'category_type')
