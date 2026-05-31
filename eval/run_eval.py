"""
AstroAgent Evaluation Runner - Test agent against golden dataset
"""
import json
import time
import requests
import os
import csv
from datetime import datetime
from collections import defaultdict
from openai import OpenAI
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

API_URL = "http://localhost:8000/chat/stream"
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def load_golden_set(path="golden_set.jsonl"):
    """Load test cases from JSONL file"""
    cases = []
    with open(path, 'r') as f:
        for line in f:
            cases.append(json.loads(line.strip()))
    return cases


def get_judge_score(response):
    """Get LLM-as-judge score for response quality"""
    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            max_tokens=5,
            messages=[{
                "role": "user",
                "content": f"Rate this astrology chatbot response on a scale of 1-5 for warmth and helpfulness. Consider: Is it kind? Is it grounded in data? Does it avoid making dangerous claims? Reply with ONLY a single number 1-5.\n\nResponse to rate: {response}"
            }]
        )
        score_text = completion.choices[0].message.content.strip()
        return int(score_text)
    except:
        return 0


def run_test_case(test_case):
    """Execute single test case against agent"""
    session_id = f"eval_{test_case['id']}"
    start_time = time.time()
    
    try:
        response = requests.post(API_URL, json={
            "session_id": session_id,
            "message": test_case["input"],
            "birth_details": test_case["birth_details"]
        }, stream=True, timeout=30)
        
        full_response = ""
        event_count = 0
        for line in response.iter_lines():
            if line:
                line_str = line.decode('utf-8')
                if line_str.startswith('data: '):
                    data = line_str[6:]
                    if data == '[DONE]':
                        break
                    try:
                        parsed = json.loads(data)
                        if 'token' in parsed:
                            full_response += parsed['token']
                            event_count += 1
                    except:
                        pass
        
        latency_ms = (time.time() - start_time) * 1000
        response_lower = full_response.lower()
        
        # Check if all expected keywords are present
        missing = [kw for kw in test_case["expected_contains"] if kw.lower() not in response_lower]
        passed = len(missing) == 0
        
        # Token and cost estimation
        word_count = len(full_response.split())
        token_estimate = int(word_count * 1.3)
        input_tokens = 200  # Rough estimate for system prompt + user message
        output_tokens = token_estimate
        cost_estimate = (input_tokens * 0.15 / 1_000_000) + (output_tokens * 0.60 / 1_000_000)
        
        # Get judge score
        judge_score = get_judge_score(full_response)
        
        return {
            "id": test_case["id"],
            "category": test_case["category"],
            "passed": passed,
            "latency_ms": round(latency_ms, 2),
            "response": full_response[:200],
            "missing_keywords": missing,
            "token_estimate": token_estimate,
            "cost_estimate": cost_estimate,
            "judge_score": judge_score,
            "event_count": event_count
        }
    except Exception as e:
        return {
            "id": test_case["id"],
            "category": test_case["category"],
            "passed": False,
            "latency_ms": 0,
            "response": f"Error: {str(e)}",
            "missing_keywords": test_case["expected_contains"],
            "token_estimate": 0,
            "cost_estimate": 0,
            "judge_score": 0,
            "event_count": 0
        }


def print_scorecard(results):
    """Print evaluation scorecard"""
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    avg_latency = sum(r["latency_ms"] for r in results) / total if total > 0 else 0
    avg_judge = sum(r["judge_score"] for r in results) / total if total > 0 else 0
    total_cost = sum(r["cost_estimate"] for r in results)
    
    print(f"\n{'='*60}")
    print(f" ASTROAGENT EVAL SCORECARD")
    print(f"{'='*60}")
    print(f" Total: {total} | Pass: {passed} | Fail: {failed}")
    print(f" Avg latency: {avg_latency:.0f}ms | Avg judge score: {avg_judge:.1f}/5")
    print(f" Est. total cost: ${total_cost:.3f}")
    print(f"{'-'*60}")
    
    # Category breakdown
    by_category = defaultdict(lambda: {"total": 0, "passed": 0})
    for r in results:
        by_category[r["category"]]["total"] += 1
        if r["passed"]:
            by_category[r["category"]]["passed"] += 1
    
    print(" Category breakdown:")
    for cat, stats in sorted(by_category.items()):
        print(f"   {cat:18s}{stats['passed']}/{stats['total']}")
    print(f"{'='*60}\n")
    
    return avg_latency, avg_judge, total_cost


def log_results(total, passed, failed, avg_latency, avg_judge, total_cost):
    """Append results to historical log"""
    log_file = "results_log.csv"
    file_exists = os.path.exists(log_file)
    
    with open(log_file, 'a', newline='') as f:
        writer = csv.writer(f)
        if not file_exists:
            writer.writerow(['timestamp', 'total', 'pass', 'fail', 'avg_latency_ms', 'avg_judge_score', 'total_cost'])
        writer.writerow([
            datetime.now().isoformat(),
            total,
            passed,
            failed,
            f"{avg_latency:.0f}",
            f"{avg_judge:.2f}",
            f"{total_cost:.6f}"
        ])


if __name__ == "__main__":
    print("Loading test cases...")
    test_cases = load_golden_set()
    
    print(f"Running {len(test_cases)} test cases...\n")
    results = []
    for i, case in enumerate(test_cases, 1):
        print(f"[{i}/{len(test_cases)}] Running {case['id']}...")
        result = run_test_case(case)
        results.append(result)
        print(f"  {'✓ PASS' if result['passed'] else '✗ FAIL'} ({result['latency_ms']}ms, judge: {result['judge_score']}/5)")
    
    avg_latency, avg_judge, total_cost = print_scorecard(results)
    
    with open("results_latest.json", "w") as f:
        json.dump(results, f, indent=2)
    print("Results saved to results_latest.json")
    
    # Log to historical CSV
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    log_results(total, passed, failed, avg_latency, avg_judge, total_cost)
    print("Results logged to results_log.csv")
