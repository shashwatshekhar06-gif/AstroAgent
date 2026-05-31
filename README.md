# AstroAgent

An AI-powered astrology chatbot that computes real birth charts and provides personalized astrological guidance.

## Tech Stack

- **Backend**: FastAPI, LangGraph, OpenAI GPT-4o-mini, ephem (astronomy calculations), SQLite
- **Frontend**: React, Vite
- **Agent Framework**: LangGraph with tool-calling loop
- **APIs**: OpenAI (LLM), PositionStack (geocoding fallback)

## Setup

### 1. Clone and Configure

```bash
git clone <repo-url>
cd astroagent
```

Create `.env` file in project root:

```
OPENAI_API_KEY=your_openai_key_here
POSITIONSTACK_API_KEY=your_positionstack_key_here
```

### 2. Backend Setup

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs at `http://localhost:8000`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

## LangGraph Architecture

```
START
  ↓
agent_node (GPT-4o-mini with tools)
  ↓
  ├─→ [has tool calls?] → tools_node → agent_node (loop)
  └─→ [no tool calls] → END
```

The agent uses conditional routing to decide whether to call tools or return the final response.

## Tools

1. **geocode_place**: Converts place name to lat/lng/timezone (with fallback for common cities)
2. **compute_birth_chart**: Calculates Sun, Moon, Ascendant, and planetary positions using ephem
3. **get_daily_transits**: Returns current planetary positions for daily horoscope
4. **knowledge_lookup**: Searches 25+ astrology facts by keyword

## Running Evaluation

```bash
cd eval
python run_eval.py
```

Runs 20 test cases, outputs scorecard with pass/fail, judge scores, latency, and cost. Results saved to `results_latest.json` and logged to `results_log.csv`.

## Known Limitations

- **Ascendant calculation**: Uses simplified sidereal time approximation (not house system)
- **Timezone handling**: No local-to-UTC conversion; assumes input time is in local timezone
- **Session persistence**: Conversation resets on browser refresh (no session restoration)
- **Geocoding**: Relies on fallback dictionary for common cities; API may fail for obscure locations
- **Tool calling**: Agent needs explicit birth details in message to trigger geocoding and chart computation

## Project Structure

```
astroagent/
├── backend/
│   ├── main.py          # FastAPI server with SSE streaming
│   ├── agent.py         # LangGraph agent definition
│   ├── tools.py         # Four astrology tools
│   ├── db.py            # SQLite conversation persistence
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── App.jsx      # Root component
│   │   ├── BirthForm.jsx # Birth details input
│   │   └── Chat.jsx     # Chat UI with streaming
│   └── package.json
├── eval/
│   ├── golden_set.jsonl # 20 test cases
│   └── run_eval.py      # Evaluation runner
└── .env                 # API keys
```

## License

MIT
