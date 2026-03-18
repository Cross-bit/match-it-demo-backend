from dataclasses import dataclass


@dataclass
class Vote:
    """
        Representation of user vote used in the async algorithm.

        Attributes:
            id (int): User identifier.
            value (int): Value of the user's vote. Allowed values: -1, 0, 1.
    """

    id: int
    value: int

    def __eq__(self, other):
        return isinstance(other, Vote) and self.id == other.id

    def __hash__(self):
        return hash(self.id)