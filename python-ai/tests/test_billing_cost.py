from app.billing.reporter import _model_cost_micros


def test_deepseek_cost_micros():
    usage = {"input_tokens": 1000, "output_tokens": 500}
    assert _model_cost_micros("deepseek-chat", usage) == (1000 * 140 + 500 * 280) // 1000


def test_default_model_cost():
    usage = {"input_tokens": 2000, "output_tokens": 1000}
    assert _model_cost_micros("unknown-model", usage) == (2000 * 200 + 1000 * 400) // 1000
