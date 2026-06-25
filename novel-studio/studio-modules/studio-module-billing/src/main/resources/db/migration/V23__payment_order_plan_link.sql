ALTER TABLE payment_order
    ADD COLUMN IF NOT EXISTS plan_id BIGINT REFERENCES product_plan(id),
    ADD COLUMN IF NOT EXISTS plan_name VARCHAR(64),
    ADD COLUMN IF NOT EXISTS idr_sku_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS idr_project_id VARCHAR(64);

UPDATE payment_order po
SET plan_id = pp.id,
    plan_name = pp.name,
    idr_sku_id = COALESCE(po.idr_sku_id, pp.idr_sku_id),
    idr_project_id = COALESCE(po.idr_project_id, pp.idr_project_id)
FROM product_plan pp
WHERE po.plan_code = pp.code
  AND po.plan_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_payment_order_plan_created ON payment_order(plan_id, created_at DESC);
