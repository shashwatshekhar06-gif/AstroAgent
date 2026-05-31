"""
AstroAgent LangGraph Agent - AI astrology guide with tool-calling loop
"""
import os
from typing import TypedDict, Annotated, Sequence
import operator
from langchain_core.messages import BaseMessage, HumanMessage, SystemMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode
from dotenv import load_dotenv

from tools import geocode_place, compute_birth_chart, get_daily_transits, knowledge_lookup

load_dotenv()


class AgentState(TypedDict):
    """State schema for the agent graph"""
    messages: Annotated[Sequence[BaseMessage], operator.add]
    birth_details: dict | None
    chart: dict | None


# System prompt for Aradhana, the astrology guide
SYSTEM_PROMPT = """You are Aradhana, a warm and insightful astrology guide.

The user's birth details will be included in their message. When you receive them:
1. Call geocode_place with the exact place name from the message
2. Call compute_birth_chart with the lat, lng, timezone returned by geocode_place, plus the date and time from the message
3. Answer the user's question warmly based on the real chart data

Rules:
- NEVER give stock trading advice, financial advice, or investment recommendations, even if the user asks. Decline and explain that astrology is for spiritual guidance only.
- Always pass lat and lng as numbers, never strings
- Never invent planetary positions
- Keep responses under 150 words
- Be warm, kind, and grounding in tone
- Never give medical, legal or financial certainty
- If asked to predict death, give stock advice, medical diagnoses, or any definitive life predictions, gently decline and explain that astrology is for guidance and self-reflection, not certainty.
- If given an impossible or invalid birth date (like month 13, day 45, etc), tell the user the date is invalid and ask them to correct it.
- If given an empty or missing birth place, ask the user to provide a valid birth place."""


def create_agent_graph():
    """
    Create LangGraph StateGraph with agent and tools nodes.
    
    Returns:
        Compiled graph ready for execution
    """
    # Initialize LLM with tools
    llm = ChatOpenAI(
        model="gpt-4o-mini",
        temperature=0.7,
        api_key=os.getenv("OPENAI_API_KEY")
    )
    
    # Bind tools to LLM
    tools = [geocode_place, compute_birth_chart, get_daily_transits, knowledge_lookup]
    llm_with_tools = llm.bind_tools(tools)
    
    # Define agent node
    def agent_node(state: AgentState) -> dict:
        """Agent node: calls GPT-4o with tools bound"""
        messages = state["messages"]
        
        # Add system prompt if not present
        if not messages or not isinstance(messages[0], SystemMessage):
            messages = [SystemMessage(content=SYSTEM_PROMPT)] + list(messages)
        
        response = llm_with_tools.invoke(messages)
        return {"messages": [response]}
    
    # Define routing function
    def should_continue(state: AgentState) -> str:
        """Route to tools if tool calls present, otherwise end"""
        last_message = state["messages"][-1]
        if hasattr(last_message, "tool_calls") and last_message.tool_calls:
            return "tools"
        return "end"
    
    # Build graph
    workflow = StateGraph(AgentState)
    
    # Add nodes
    workflow.add_node("agent", agent_node)
    workflow.add_node("tools", ToolNode(tools))
    
    # Add edges
    workflow.set_entry_point("agent")
    workflow.add_conditional_edges("agent", should_continue, {"tools": "tools", "end": END})
    workflow.add_edge("tools", "agent")
    
    return workflow.compile()


# Export compiled graph
graph = create_agent_graph()
