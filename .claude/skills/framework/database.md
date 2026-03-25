# Skill: Database Patterns

**Used by:** DB Engineer, Code Reviewer.

---

## Naming Conventions

```sql
-- Tables: plural, snake_case
users, orders, order_items, refresh_tokens

-- Columns: snake_case
created_at, updated_at, user_id, is_active

-- Primary keys: always 'id' (UUID)
id UUID PRIMARY KEY DEFAULT gen_random_uuid()

-- Foreign keys: <table_singular>_id
user_id UUID REFERENCES users(id) ON DELETE CASCADE

-- Indexes: idx_<table>_<columns>
idx_users_email
idx_orders_user_id_created_at
```

---

## Standard Columns on Every Table

```sql
CREATE TABLE users (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- ... domain columns
);

-- Auto-update updated_at with trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
```

---

## Indexing Strategy

```sql
-- Index FK columns (always)
CREATE INDEX idx_orders_user_id ON orders(user_id);

-- Index columns used in WHERE filters
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_sessions_token ON sessions(token);

-- Composite index for multi-column queries (order matters: most selective first)
CREATE INDEX idx_orders_user_status ON orders(user_id, status);

-- Partial index for common filtered queries
CREATE INDEX idx_orders_pending ON orders(created_at)
  WHERE status = 'pending';

-- Unique constraint (also creates index)
ALTER TABLE users ADD CONSTRAINT uq_users_email UNIQUE (email);
```

**Rule:** Index any column that appears in WHERE, JOIN ON, or ORDER BY clauses in common queries.

---

## Soft Delete Pattern

```sql
-- Add to tables that need audit trail
deleted_at TIMESTAMPTZ NULL

-- Query pattern
SELECT * FROM users WHERE deleted_at IS NULL;

-- Index for performance
CREATE INDEX idx_users_deleted_at ON users(deleted_at)
  WHERE deleted_at IS NULL;
```

---

## Migration Patterns

```sql
-- Always use transactions for DDL changes
BEGIN;

ALTER TABLE users ADD COLUMN phone VARCHAR(20);
CREATE INDEX CONCURRENTLY idx_users_phone ON users(phone);
UPDATE users SET phone = '' WHERE phone IS NULL;
ALTER TABLE users ALTER COLUMN phone SET NOT NULL;

COMMIT;

-- Zero-downtime: use CONCURRENTLY for index creation on large tables
CREATE INDEX CONCURRENTLY idx_orders_status ON orders(status);
-- Note: CONCURRENTLY cannot run inside a transaction block
```

**Migration rules:**
- Never drop a column in the same migration that removes all app references — do in two deploys
- Always add columns as nullable first, backfill, then add NOT NULL constraint
- Never rename columns/tables without a multi-step deprecation

---

## TypeORM Entity Example (NestJS)

```typescript
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, Index } from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()  // FK index
  @Column({ name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'enum',
    enum: ['pending', 'paid', 'shipped', 'cancelled'],
    default: 'pending',
  })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: string; // Use string for decimals — avoid float precision issues

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
```

---

## SQLAlchemy Model Example (FastAPI)

```python
from sqlalchemy import Column, String, Numeric, Enum, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        Index("idx_orders_user_id", "user_id"),
        Index("idx_orders_user_status", "user_id", "status"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    status = Column(Enum("pending", "paid", "shipped", "cancelled", name="order_status"), default="pending")
    total = Column(Numeric(10, 2), nullable=False)
    created_at = Column(TIMESTAMPTZ, server_default=func.now(), nullable=False)
    updated_at = Column(TIMESTAMPTZ, server_default=func.now(), onupdate=func.now(), nullable=False)

    user = relationship("User", back_populates="orders")
```

---

## Query Optimization Checklist

```
[ ] FK columns indexed
[ ] Filter columns indexed (WHERE clauses)
[ ] Composite indexes for multi-column filters
[ ] EXPLAIN ANALYZE run on queries touching > 1000 rows
[ ] N+1 queries avoided (eager loading / joins instead of loops)
[ ] Decimal columns use NUMERIC/DECIMAL, not FLOAT
[ ] Large text fields use TEXT (not VARCHAR with arbitrary limit)
[ ] JSON fields use JSONB (not JSON) for indexability
```
