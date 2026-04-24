import unittest
from unittest.mock import Mock

from src.services.recommendations.algorithms.async_algorithm.threshold_policy import (
    ThresholdPolicySigmoid,
    ThresholdPolicyStatic,
)


class ThresholdPoliciesTests(unittest.TestCase):
    def test_static_policy_round_zero_is_zero(self):
        policy = ThresholdPolicyStatic(t_param=3)
        self.assertEqual(policy.get_parameter_value(0, "u1"), 0)
        self.assertEqual(policy.get_parameter_value(2, "u1"), 3)

    def test_static_policy_metadata_contains_threshold(self):
        policy = ThresholdPolicyStatic(t_param=5)
        metadata = policy.get_metadata()
        self.assertEqual(metadata["type"], "ThresholdPolicyStatic")
        self.assertEqual(metadata["t_param"], 5)

    def test_sigmoid_policy_round_zero_is_zero(self):
        context = Mock()
        context.get_user_queue_size.return_value = 10
        policy = ThresholdPolicySigmoid(
            red_context=context,
            window_size=10,
            sigmoid_center=5,
            sigmoid_steepness=1.4,
            c_init=0.2,
            max_filling=10,
            min_filling=0,
        )
        self.assertEqual(policy.get_parameter_value(0, "u1"), 0)

    def test_sigmoid_policy_value_respects_window_bounds(self):
        context = Mock()
        context.get_user_queue_size.return_value = 10
        policy = ThresholdPolicySigmoid(
            red_context=context,
            window_size=12,
            sigmoid_center=4,
            sigmoid_steepness=1.0,
            c_init=0.1,
            max_filling=10,
            min_filling=0,
        )
        value = policy.get_parameter_value(3, "u1")
        self.assertGreaterEqual(value, 0)
        self.assertLessEqual(value, 12)

    def test_sigmoid_scaler_clamps_out_of_range_values(self):
        context = Mock()
        policy = ThresholdPolicySigmoid(
            red_context=context,
            window_size=10,
            max_filling=70,
            min_filling=20,
        )
        self.assertEqual(policy.scaler(-100, 20, 70), 0)
        self.assertEqual(policy.scaler(20, 20, 70), 0)
        self.assertEqual(policy.scaler(70, 20, 70), 1)
        self.assertEqual(policy.scaler(1000, 20, 70), 1)


if __name__ == "__main__":
    unittest.main()
