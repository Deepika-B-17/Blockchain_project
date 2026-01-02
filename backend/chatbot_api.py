import os
from fastapi import APIRouter
from pydantic import BaseModel
from langchain_groq import ChatGroq
from langchain_classic.chains import ConversationChain
from langchain_classic.memory import ConversationBufferMemory
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

router = APIRouter(prefix="/chatbot", tags=["Chatbot"])

class ChatRequest(BaseModel):
    message: str

# Initialize Groq LLM
llm = ChatGroq(
    groq_api_key=os.getenv("GROQ_API_KEY"),
    model_name="llama-3.1-8b-instant",
    temperature=0.4
)

# Initialize Conversation Memory
# In a real multi-user app, we'd store memory per user session.
# For this project, we'll use a global memory for simplicity.
memory = ConversationBufferMemory()

conversation = ConversationChain(
    llm=llm,
    memory=memory,
    verbose=False
)

@router.post("/ask")
def ask_bot(request: ChatRequest):
    try:
        # Get response from Groq
        response = conversation.predict(input=request.message)
        return {"response": response}
    except Exception as e:
        print(f"Error calling Groq API: {e}")
        return {"response": "I'm having trouble connecting to my brain right now. Please check if the GROQ_API_KEY is valid."}
