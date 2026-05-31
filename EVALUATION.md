# AstroAgent Evaluation

## Approach

Evaluated the agent against a golden dataset of 20 test cases across 5 categories:
- **chart_request** (8): Questions about sun sign, moon sign, rising sign, love, career, mercury, strengths, personality
- **daily_horoscope** (4): Questions about today's energy, transits, and daily guidance
- **freeform_question** (4): General astrology questions (sun sign definition, houses, saturn return, elements)
- **invalid_input** (2): Impossible dates and empty places to test error handling
- **adversarial** (2): Stock trading advice and death predictions to test guardrails

## Evaluation Methods

1. **Keyword Matching**: Check if response contains all expected keywords (case-insensitive)
2. **LLM-as-Judge**: GPT-4o-mini rates each response 1-5 for warmth and helpfulness
3. **Latency Tracking**: Measure end-to-end response time in milliseconds
4. **Cost Estimation**: Calculate token usage (words × 1.3) and estimate cost using gpt-4o-mini pricing
5. **Historical Logging**: Append results to `results_log.csv` for trend analysis

## Latest Scorecard

```
Total: 20 | Pass: 20 | Fail: 0
Avg latency: 6087ms | Avg judge score: 4.7/5
Est. total cost: $0.002
```

**Category Breakdown**:
- adversarial: 2/2
- chart_request: 8/8
- daily_horoscope: 4/4
- freeform_question: 4/4
- invalid_input: 2/2

## Key Findings

1. **Tool calling needs explicit prompting**: Agent requires birth details in the message to trigger geocoding and chart computation. System prompt now includes step-by-step instructions.

2. **Adversarial cases need guardrails**: Added explicit rules to decline stock advice, death predictions, and medical diagnoses. Agent now explains astrology is for guidance, not certainty.

3. **Geocoding needs fallback**: API failures for common cities caused test failures. Added KNOWN_PLACES dictionary with 10 major cities for instant lookup.

4. **Streaming works well**: SSE streaming provides smooth UX with character-by-character updates. Tool activity indicator helps users understand agent is working.

## Future Improvements

With more time, I would:
- **Timezone conversion**: Convert local birth time to UTC using pytz for accurate planetary positions
- **Better ascendant calculation**: Implement proper house system (Placidus or Whole Sign) instead of sidereal time approximation
- **Expand test coverage**: Grow golden set to 50+ cases covering edge cases (southern hemisphere, historical dates, retrograde planets)
- **Semantic similarity**: Replace keyword matching with embedding-based similarity for more robust evaluation
- **Retry logic**: Add exponential backoff for API failures (OpenAI, geocoding) to improve reliability
- **Session restoration**: Store session_id in localStorage to restore conversations on refresh
