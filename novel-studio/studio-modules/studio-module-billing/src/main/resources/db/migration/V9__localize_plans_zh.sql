-- 套餐文案中文化（与前端 Pricing 页一致）

UPDATE product_plan SET
    name = '体验版',
    description = '适合轻度创作与入门体验，零成本开启 AI 辅助写作。'
WHERE code = 'hobby';

UPDATE product_plan SET
    name = '专业版',
    description = '面向全职作者与高频创作者，更大额度与完整能力。'
WHERE code = 'pro';

UPDATE product_plan SET
    name = '企业版',
    description = '面向出版社与创作团队，支持协作与定制集成。'
WHERE code = 'enterprise';
