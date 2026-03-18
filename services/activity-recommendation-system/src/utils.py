import uuid


class Utils:
    @staticmethod
    def convertUUIDToInteger(uuid_str: str):
        return uuid.UUID(uuid_str).int
        #return int(uuid.replace("-", ""), 16)