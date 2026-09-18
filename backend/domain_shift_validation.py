"""
domain_shift_validation.py

Dreaddit is written Reddit text. Our app's real input is transcribed
spoken diary entries — different register, more casual, no Reddit-specific
phrasing. This is an honest gap worth checking rather than assuming away.

VALIDATION_SET below: 20 hand-written, hand-labeled "spoken diary style"
statements (10 stressed, 10 not stressed), deliberately NOT written like
Reddit posts — more like something someone would actually say out loud
into a voice memo.

HOW TO USE ONCE PERSON A'S MODEL IS READY:

    Option A — via the mock-free pipeline (needs MODEL_API_URL set, USE_MOCK_MODEL=false):
        python domain_shift_validation.py

    Option B — call A's endpoint directly if you don't want to go through
    the full app pipeline yet; either way this script just needs a function
    that takes text and returns a stress_score.

Prints accuracy plus every case the model got wrong, so you have specific
examples ready to discuss either way ("it held up on speech-like text" or
"here's the specific pattern it missed").
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# (transcript, is_stressed: bool) — label is your ground truth, set by hand.
VALIDATION_SET = [
    # --- stressed (10) ---
    ("Today was rough, I had three deadlines hit at once and I just felt like I couldn't breathe.", True),
    ("I've been lying awake every night this week just running through everything I haven't done yet.", True),
    ("Honestly I snapped at my roommate over nothing today, I think I'm just running on empty.", True),
    ("My chest has been tight all day and I keep forgetting to eat, it's been a lot lately.", True),
    ("I sat in my car for ten minutes before going in because I genuinely didn't think I could handle today.", True),
    ("Every time my phone buzzes right now I feel this wave of dread, I don't even know why anymore.", True),
    ("I keep rereading the same email over and over because I can't get my brain to focus on anything.", True),
    ("I cried in the bathroom at work today and I don't even know exactly what set it off.", True),
    ("I feel like I'm juggling too many things and one more thing is going to make me drop all of it.", True),
    ("I haven't really talked to anyone in days, I just don't have the energy to explain how I'm doing.", True),

    # --- not stressed (10) ---
    ("Had a pretty normal day, went grocery shopping and made pasta for dinner.", False),
    ("Went for a walk this morning, the weather was nice so I took the long way home.", False),
    ("Caught up with an old friend over coffee, it was really nice to just chat for a while.", False),
    ("Finished a book I've been reading for a few weeks, felt good to actually finish it.", False),
    ("Cleaned my apartment today, nothing exciting but it feels good to have it tidy.", False),
    ("Tried a new recipe tonight, it turned out better than I expected honestly.", False),
    ("Watched a movie with my family, pretty relaxed evening overall.", False),
    ("Went to the gym, did a light workout, feeling good about sticking to it this week.", False),
    ("Ran a few errands and then just relaxed on the couch for the rest of the afternoon.", False),
    ("Had a good conversation with a coworker over lunch, nothing stressful about today.", False),
]


def run_validation(predict_fn):
    """predict_fn(transcript: str) -> float (0-1 stress score). Threshold at
    0.5 to convert to a binary prediction for comparison against ground truth."""
    correct = 0
    misses = []

    for transcript, is_stressed in VALIDATION_SET:
        score = predict_fn(transcript)
        predicted = score > 0.5
        if predicted == is_stressed:
            correct += 1
        else:
            misses.append((transcript, is_stressed, score))

    total = len(VALIDATION_SET)
    accuracy = correct / total

    print(f"Domain-shift validation: {correct}/{total} correct ({accuracy:.0%})\n")
    if misses:
        print("Misclassified:")
        for transcript, expected, score in misses:
            print(f"  expected={'stressed' if expected else 'not stressed':13s} "
                  f"got_score={score:.2f}  \"{transcript}\"")
    else:
        print("No misses — held up on every example in this set.")

    return accuracy, misses


if __name__ == "__main__":
    from dotenv import load_dotenv
    load_dotenv()

    from app import model_client

    if model_client.USE_MOCK_MODEL:
        print("USE_MOCK_MODEL is true — set it to false in .env once Person A's "
              "real model is live, then rerun this script for a real result.\n"
              "Running against the mock now just to confirm the script itself works:\n")

    def predict(transcript: str) -> float:
        return model_client.get_stress_prediction(transcript)["stress_score"]

    run_validation(predict)
