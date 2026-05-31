"""
AstroAgent Tools - Four specialized tools for astrology agent
"""
import os
import ephem
import requests
from datetime import datetime
from typing import Dict, Any
from langchain.tools import tool
from dotenv import load_dotenv

load_dotenv()

ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
]

ASTROLOGY_KNOWLEDGE = {
    "aries": "Aries (March 21 - April 19): Cardinal Fire sign ruled by Mars. Known for courage, leadership, and pioneering spirit. Can be impulsive.",
    "taurus": "Taurus (April 20 - May 20): Fixed Earth sign ruled by Venus. Known for stability, patience, and sensuality. Can be stubborn.",
    "gemini": "Gemini (May 21 - June 20): Mutable Air sign ruled by Mercury. Known for communication, curiosity, and wit. Can be restless.",
    "cancer": "Cancer (June 21 - July 22): Cardinal Water sign ruled by the Moon. Known for nurturing and emotional depth. Can be moody.",
    "leo": "Leo (July 23 - August 22): Fixed Fire sign ruled by the Sun. Known for confidence, creativity, and warmth. Can be dramatic.",
    "virgo": "Virgo (August 23 - September 22): Mutable Earth sign ruled by Mercury. Known for precision and service. Can be overly critical.",
    "libra": "Libra (September 23 - October 22): Cardinal Air sign ruled by Venus. Known for balance and diplomacy. Can be indecisive.",
    "scorpio": "Scorpio (October 23 - November 21): Fixed Water sign ruled by Pluto. Known for intensity and transformation. Can be secretive.",
    "sagittarius": "Sagittarius (November 22 - December 21): Mutable Fire sign ruled by Jupiter. Known for optimism and adventure. Can be tactless.",
    "capricorn": "Capricorn (December 22 - January 19): Cardinal Earth sign ruled by Saturn. Known for ambition and discipline. Can be rigid.",
    "aquarius": "Aquarius (January 20 - February 18): Fixed Air sign ruled by Uranus. Known for innovation and independence. Can be detached.",
    "pisces": "Pisces (February 19 - March 20): Mutable Water sign ruled by Neptune. Known for compassion and intuition. Can be escapist.",
    "sun sign": "Your Sun sign represents your core identity and life purpose. It is the most commonly known astrological placement.",
    "moon sign": "Your Moon sign represents emotions and instincts. It reveals how you process feelings and what makes you feel secure.",
    "rising sign": "Your Rising sign (Ascendant) is how others perceive you. It is determined by your exact birth time and place.",
    "mercury retrograde": "Mercury Retrograde (3-4x per year) brings communication mishaps and delays. Good time for reflection and revision.",
    "venus retrograde": "Venus Retrograde (every 18 months) affects relationships and values. Time to reassess what you truly value.",
    "mars retrograde": "Mars Retrograde (every 2 years) affects energy and motivation. Time to redirect and reassess goals.",
    "jupiter": "Jupiter represents expansion, luck, and growth. Shows where you experience abundance. 12-year orbit.",
    "saturn": "Saturn represents discipline and life lessons. Shows where you face challenges and build mastery. 29-year orbit.",
    "houses": "12 houses cover life areas: 1st=self, 2nd=money, 3rd=communication, 4th=home, 5th=creativity, 6th=health, 7th=partnerships, 8th=transformation, 9th=philosophy, 10th=career, 11th=community, 12th=spirituality.",
    "aspects": "Aspects are planet angles: Conjunction (0°), Sextile (60°), Square (90°), Trine (120°), Opposition (180°).",
    "elements": "Fire (Aries, Leo, Sagittarius): passion. Earth (Taurus, Virgo, Capricorn): practicality. Air (Gemini, Libra, Aquarius): intellect. Water (Cancer, Scorpio, Pisces): emotion.",
    "transits": "Transits are current planetary positions affecting your birth chart, triggering events and internal shifts.",
    "north node": "North Node represents your soul's purpose and growth direction in this lifetime.",
    "south node": "South Node represents past patterns and innate talents you are meant to move beyond.",
}


KNOWN_PLACES = {
    "bangalore": {"lat": 12.9716, "lng": 77.5946, "timezone": "Asia/Kolkata", "formatted_address": "Bangalore, Karnataka, India"},
    "bengaluru": {"lat": 12.9716, "lng": 77.5946, "timezone": "Asia/Kolkata", "formatted_address": "Bengaluru, Karnataka, India"},
    "mumbai": {"lat": 19.0760, "lng": 72.8777, "timezone": "Asia/Kolkata", "formatted_address": "Mumbai, Maharashtra, India"},
    "delhi": {"lat": 28.6139, "lng": 77.2090, "timezone": "Asia/Kolkata", "formatted_address": "Delhi, India"},
    "new york": {"lat": 40.7128, "lng": -74.0060, "timezone": "America/New_York", "formatted_address": "New York, NY, USA"},
    "london": {"lat": 51.5074, "lng": -0.1278, "timezone": "Europe/London", "formatted_address": "London, UK"},
    "chennai": {"lat": 13.0827, "lng": 80.2707, "timezone": "Asia/Kolkata", "formatted_address": "Chennai, Tamil Nadu, India"},
    "hyderabad": {"lat": 17.3850, "lng": 78.4867, "timezone": "Asia/Kolkata", "formatted_address": "Hyderabad, Telangana, India"},
    "kolkata": {"lat": 22.5726, "lng": 88.3639, "timezone": "Asia/Kolkata", "formatted_address": "Kolkata, West Bengal, India"},
    "pune": {"lat": 18.5204, "lng": 73.8567, "timezone": "Asia/Kolkata", "formatted_address": "Pune, Maharashtra, India"},
}


def degrees_to_sign(degrees: float) -> tuple:
    degrees = float(degrees) % 360
    sign_index = int(degrees / 30)
    degree_in_sign = round(degrees % 30, 2)
    return ZODIAC_SIGNS[sign_index], degree_in_sign


def get_ecliptic_deg(body) -> float:
    ecl = ephem.Ecliptic(body)
    return float(ecl.lon) * 180.0 / ephem.pi


@tool
def geocode_place(place_name: str) -> Dict[str, Any]:
    """Convert a place name to latitude, longitude, and timezone."""
    # Check fallback dictionary first
    place_key = place_name.lower().strip()
    if place_key in KNOWN_PLACES:
        return KNOWN_PLACES[place_key]
    
    api_key = os.getenv("POSITIONSTACK_API_KEY")
    if not api_key:
        return {"error": "POSITIONSTACK_API_KEY not set in .env"}
    try:
        r = requests.get(
            "http://api.positionstack.com/v1/forward",
            params={"access_key": api_key, "query": place_name, "limit": 1},
            timeout=10
        )
        r.raise_for_status()
        data = r.json()
        if not data.get("data"):
            return {"error": f"No results for: {place_name}"}
        res = data["data"][0]
        return {
            "lat": res["latitude"],
            "lng": res["longitude"],
            "timezone": res.get("timezone_module", {}).get("name", "UTC"),
            "formatted_address": res.get("label", place_name)
        }
    except Exception as e:
        return {"error": str(e)}


@tool
def compute_birth_chart(date: str, time: str, lat: float, lng: float, timezone: str) -> Dict[str, Any]:
    """Compute a natal birth chart using real astronomy (ephem library)."""
    try:
        lat = float(lat)
        lng = float(lng)
        obs = ephem.Observer()
        obs.lat = str(lat)
        obs.lon = str(lng)
        obs.date = f"{date} {time}:00"
        obs.pressure = 0

        bodies = {
            "sun": ephem.Sun(),
            "moon": ephem.Moon(),
            "mercury": ephem.Mercury(),
            "venus": ephem.Venus(),
            "mars": ephem.Mars(),
            "jupiter": ephem.Jupiter(),
            "saturn": ephem.Saturn(),
        }

        result = {}
        for name, body in bodies.items():
            body.compute(obs)
            deg = get_ecliptic_deg(body)
            sign, deg_in_sign = degrees_to_sign(deg)
            result[name] = {"sign": sign, "degree": deg_in_sign}

        # Ascendant approximation via sidereal time
        lst_deg = float(obs.sidereal_time()) * 180.0 / ephem.pi
        asc_deg = (lst_deg + float(lng)) % 360
        asc_sign, asc_deg_in_sign = degrees_to_sign(asc_deg)
        result["ascendant"] = {"sign": asc_sign, "degree": asc_deg_in_sign}

        return result
    except Exception as e:
        return {"error": str(e)}


@tool
def get_daily_transits(date: str, lat: float, lng: float) -> Dict[str, Any]:
    """Get current planetary positions for a given date."""
    try:
        lat = float(lat)
        lng = float(lng)
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")

        obs = ephem.Observer()
        obs.lat = str(lat)
        obs.lon = str(lng)
        obs.date = f"{date} 12:00:00"
        obs.pressure = 0

        bodies = {
            "sun": ephem.Sun(),
            "moon": ephem.Moon(),
            "mercury": ephem.Mercury(),
            "venus": ephem.Venus(),
            "mars": ephem.Mars(),
        }

        planets = {}
        for name, body in bodies.items():
            body.compute(obs)
            deg = get_ecliptic_deg(body)
            sign, deg_in_sign = degrees_to_sign(deg)
            planets[name] = {"sign": sign, "degree": deg_in_sign}

        return {"date": date, "planets": planets}
    except Exception as e:
        return {"error": str(e)}


@tool
def knowledge_lookup(query: str) -> str:
    """Search the astrology knowledge base by keyword."""
    q = query.lower()
    matches = []
    for key, value in ASTROLOGY_KNOWLEDGE.items():
        if key in q or any(w in key for w in q.split()):
            matches.append((2, value))
        elif q in value.lower():
            matches.append((1, value))
    matches.sort(reverse=True)
    top = [v for _, v in matches[:3]]
    if not top:
        return "No specific match found. I can offer general astrological guidance based on your chart."
    return "\n\n".join(top)