from typing import List
from src.database.models import *

class MatchingSessionInfoDTO(BaseModel):
    id: int
    sessionUUID: str
    sessionSize: int
    sessionType: str
    members: List[MemberData]

class RecommendationUpdateDTO(BaseModel):
    session: MatchingSessionInfoDTO
    usersVotingResults: List[UserVotes]

class NextRecommendationItem:

    def __init__(self, itemId: int, score: float, cardData):
        self.itemId = itemId
        self.score = score
        self.cardData = cardData

    def to_dict(self):
        return {
            "itemId": int(self.itemId),
            "score": float(self.score),
            "cardData": (
                self.cardData.to_dict()
                if hasattr(self.cardData, "to_dict")
                else self.cardData
            )
        }
