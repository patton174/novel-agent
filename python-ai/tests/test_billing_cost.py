from app.billing.reporter import _compute_cost


def test_compute_cost_from_model_pricing():
    pricing = {"input_per_1k_micros": 140, "output_per_1k_micros": 280, "multiplier": 1.0}
    assert _compute_cost(1000, 500, pricing) == 140 + 140


def test_compute_cost_default_multiplier():
    pricing = {"input_per_1k_micros": 200, "output_per_1k_micros": 400, "multiplier": 1.0}
    assert _compute_cost(2000, 1000, pricing) == 400 + 400
