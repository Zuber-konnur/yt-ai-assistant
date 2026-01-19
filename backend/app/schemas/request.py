from pydantic import BaseModel

class CommandRequest(BaseModel):
    command: str
    session_id: str
