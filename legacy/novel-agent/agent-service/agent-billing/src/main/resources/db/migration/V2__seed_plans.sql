-- Seed default product plans (aligns with frontend PricingPage copy)

INSERT INTO product_plan (code, name, description, price_cents, monthly_token_quota, monthly_run_quota, rate_limit_rpm, is_featured, sort_order)
VALUES
    ('hobby', 'Hobby', 'Perfect for casual writers and hobbyists.', 0, 10000, 50, 10, FALSE, 1),
    ('pro', 'Pro', 'For dedicated novelists and professionals.', 9900, 1000000, NULL, 60, TRUE, 2),
    ('enterprise', 'Enterprise', 'For publishing houses and teams.', NULL, NULL, NULL, 300, FALSE, 3)
ON CONFLICT (code) DO NOTHING;

INSERT INTO plan_feature (plan_id, feature_key, enabled)
SELECT p.id, 'basic_editor', TRUE FROM product_plan p WHERE p.code = 'hobby'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO plan_feature (plan_id, feature_key, enabled)
SELECT p.id, 'txt_export', TRUE FROM product_plan p WHERE p.code = 'hobby'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO plan_feature (plan_id, feature_key, enabled)
SELECT p.id, fk.feature_key, TRUE
FROM product_plan p
CROSS JOIN (VALUES ('basic_editor'), ('txt_export'), ('pdf_export'), ('custom_model'), ('priority_support')) AS fk(feature_key)
WHERE p.code = 'pro'
ON CONFLICT (plan_id, feature_key) DO NOTHING;

INSERT INTO plan_feature (plan_id, feature_key, enabled)
SELECT p.id, fk.feature_key, TRUE
FROM product_plan p
CROSS JOIN (
    VALUES
        ('basic_editor'),
        ('txt_export'),
        ('pdf_export'),
        ('custom_model'),
        ('priority_support'),
        ('team_collaboration'),
        ('custom_integrations')
) AS fk(feature_key)
WHERE p.code = 'enterprise'
ON CONFLICT (plan_id, feature_key) DO NOTHING;
