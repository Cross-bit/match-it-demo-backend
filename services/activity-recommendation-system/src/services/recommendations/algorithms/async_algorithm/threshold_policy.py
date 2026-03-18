from abc import ABC, abstractmethod
import numpy as np

from src.services.recommendations.algorithms.async_algorithm.redistribution_unit import RedistributionContext


#
# Threshold policies
# ======================================================================
# Provides interface and base implementation of threshold policies for async group recommender.
#

class ThresholdPolicy(ABC):
    """
        Base ABC class defining interface for threshold policy.
    """

    @abstractmethod
    def get_parameter_value(self, round: int, user_id: str):
        """ Returns threshold parameter value for given round and given user_id.

        Args:
            round (int): Recommendation round.
            user_id (str): User id to return value to.
        """
        pass

    def get_metadata(self):
        """
            Returns basic meta-information about the threshold policy implementation.
        """

        return {
            "type": self.__class__.__name__,
            "general_desc": "Threshold parameter policy."
        }

class ThresholdPolicyStatic(ThresholdPolicy):
    """
        Basic implementation of threshold policy function with single static parameter t_param.
    """

    def __init__(self, t_param: int):
        """
        Sets a static threshold used for all rounds except round 0.

        Args:
            t_param (int): Static threshold value.
        """

        self.t = t_param
        super().__init__()

    def get_parameter_value(self, round: int, user_id: str):
        """
            Returns 0 for round 0, otherwise returns the static threshold value.
        """

        if (round == 0):
            return 0
        else:
            return self.t

    def get_metadata(self):
        """
            Returns metadata including the static threshold value.
        """
        base = super().get_metadata()
        base["t_param"] = self.t
        return base

class ThresholdPolicySigmoid(ThresholdPolicy):
    """
        Dynamically adjusted threshold policy using a sigmoid function.
    """

    def __init__(self, red_context: RedistributionContext, window_size, sigmoid_center = 5,
                sigmoid_steepness = 1.4, c_init: float = 0.2, max_filling = 10, min_filling=0):
        """
            Initializes the sigmoid-based threshold policy and its parameters.

        Args:
            red_context (RedistributionContext): Redistribution context used for filling updates.
            window_size (int): Total number of elements we recommend to a user.
            sigmoid_center (float): The center of the sigmoid function (meaning in which round the sigmoid reaches 50 % of total capacity).
            sigmoid_steepness (float): Curve steepness.
            c_init (float): Lower bound of the sigmoid value for all rounds. The parameter value never goes below this value.
            max_filling (float): Maximal number of elements in the redistribution unit queue on which the sigmoid must be fully opened.
            min_filling (float): Maximal number of elements in the redistribution unit queue on which the sigmoid must be fully closed (the value of sigmoid yet still stays lower bounded by c_init).
        """
        self.redistribution_context = red_context
        self.min_filling = min_filling # typically 0 is a good option
        self.max_filling = max_filling
        self.c_init = c_init
        self.steepness = sigmoid_steepness
        epsilon = 0.015 # the accuracy of the k_{epsilon}
        self.sigmoid_center = sigmoid_center
        self.transition_point = self.get_transition_point(sigmoid_center, sigmoid_steepness, c_init, epsilon)
        self.window_size = window_size
        super().__init__()

    def scaler(self, filling, min_filling = 20, max_filling = 70):
        """ Scales sigmoid by the filling of the users queue. """
        return np.maximum(0, np.minimum(filling, max_filling) - min_filling)/(max_filling - min_filling)

    def modified_sigmoid_with_upper_bound(self, x, c, k0, a, filling, min_filling, max_filling):
        return c + ((1 - c) / (1 + np.exp(-a * (x - k0)))) * self.scaler(filling, min_filling, max_filling)

    def get_transition_point(self, sigmoid_center_x, alpha, c_0, epsilon):
        """ the x value where value of sigmoid is less than c_0 with epsilon accuracy interval, alpha -- steepness of the sigmoid"""
        delta_epsilon = (1 / alpha) * np.log((1 - c_0) / epsilon - 1)
        x_constant_ends = sigmoid_center_x - delta_epsilon
        return x_constant_ends

    def get_parameter_value(self, current_round: int, user_id: str):
        """
            Returns 0 for round 0, otherwise returns the value given by the sigmoid function.
        """
        if (current_round == 0):
            return 0
        else:
            queue_filling = self.redistribution_context.get_user_queue_size(user_id)
            value = self.modified_sigmoid_with_upper_bound(current_round, self.c_init, self.transition_point, self.steepness, queue_filling, self.min_filling, self.max_filling)
            return int(round(float(self.window_size * value)))

    def get_metadata(self):
        """
            Returns metadata including current sigmoid function settings.
        """
        base = super().get_metadata()
        base.update({
            "sigmoid_center": self.sigmoid_center,
            "sigmoid_steepness": self.steepness,
            "c_init": self.c_init,
            "max_filling": self.max_filling,
            "min_filling": self.min_filling,
            "transition_point": self.transition_point,
        })
        return base