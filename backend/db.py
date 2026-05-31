"""
AstroAgent Database - SQLite persistence for conversation history
"""
import sqlite3
import json
from datetime import datetime
from typing import Dict, Any, List

DB_PATH = "astroagent.db"


def init_db():
    """Initialize database with conversations table"""
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            session_id TEXT PRIMARY KEY,
            messages TEXT,
            chart TEXT,
            updated_at TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


def save_conversation(session_id: str, messages: List[Dict[str, Any]], chart: Dict[str, Any] | None = None):
    """
    Save or update conversation in database.
    
    Args:
        session_id: Unique session identifier
        messages: List of message dictionaries
        chart: Birth chart data (optional)
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("""
        INSERT OR REPLACE INTO conversations (session_id, messages, chart, updated_at)
        VALUES (?, ?, ?, ?)
    """, (session_id, json.dumps(messages), json.dumps(chart), datetime.now()))
    conn.commit()
    conn.close()


def load_conversation(session_id: str) -> Dict[str, Any]:
    """
    Load conversation from database.
    
    Args:
        session_id: Unique session identifier
    
    Returns:
        Dictionary with messages, chart, and updated_at
    """
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT messages, chart, updated_at FROM conversations WHERE session_id = ?", (session_id,))
    row = cursor.fetchone()
    conn.close()
    
    if row:
        return {
            "messages": json.loads(row[0]) if row[0] else [],
            "chart": json.loads(row[1]) if row[1] else None,
            "updated_at": row[2]
        }
    return {"messages": [], "chart": None, "updated_at": None}


# Auto-create table on import
init_db()
