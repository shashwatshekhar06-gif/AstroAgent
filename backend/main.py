"""
AstroAgent FastAPI Server - Chat streaming endpoint with SSE
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Any
from langchain_core.messages import HumanMessage, AIMessage
import json

from agent import graph
from db import save_conversation, load_conversation

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ChatRequest(BaseModel):
    session_id: str
    message: str
    birth_details: Dict[str, Any] | None = None


@app.get("/health")
async def health_check():
    return {"status": "ok"}


@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    async def generate():
        conversation = load_conversation(request.session_id)
        messages = conversation["messages"]
        chart = conversation["chart"]

        lc_messages = []
        for msg in messages:
            if msg["role"] == "user":
                lc_messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                lc_messages.append(AIMessage(content=msg["content"]))

        # Include birth details in message so agent has real data to work with
        if request.birth_details:
            birth_context = (
                f"My birth details — "
                f"Date: {request.birth_details.get('date')}, "
                f"Time: {request.birth_details.get('time')}, "
                f"Place: {request.birth_details.get('place')}. "
                f"My question: {request.message}"
            )
            lc_messages.append(HumanMessage(content=birth_context))
        else:
            lc_messages.append(HumanMessage(content=request.message))

        state = {
            "messages": lc_messages,
            "birth_details": request.birth_details,
            "chart": chart
        }

        assistant_response = ""

        try:
            async for event in graph.astream(state, stream_mode="values"):
                if "messages" not in event:
                    continue
                last = event["messages"][-1]
                if (
                    isinstance(last, AIMessage)
                    and isinstance(last.content, str)
                    and last.content.strip()
                    and not last.tool_calls
                ):
                    if len(last.content) > len(assistant_response):
                        new_part = last.content[len(assistant_response):]
                        assistant_response = last.content
                        for char in new_part:
                            yield f"data: {json.dumps({'token': char})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'token': f'Error: {str(e)}'})}\n\n"

        messages.append({"role": "user", "content": request.message})
        messages.append({"role": "assistant", "content": assistant_response})
        if request.birth_details and not chart:
            chart = request.birth_details
        save_conversation(request.session_id, messages, chart)

        yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
