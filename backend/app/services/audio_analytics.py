import os
import re
import math
from typing import Dict, Any, List, Optional
import numpy as np
from scipy.io import wavfile

DEFAULT_FILLER_WORDS = [
    "um", "uh", "er", "ah",
    "like", "you know", "actually",
    "basically", "so yeah", "kind of",
    "sort of", "i mean"
]


class AudioAnalyticsEngine:
    def __init__(self, filler_phrases: Optional[List[str]] = None):
        self.filler_phrases = filler_phrases or DEFAULT_FILLER_WORDS

    def detect_filler_words(self, transcript_text: str) -> Dict[str, Any]:
        """
        Count occurrences of filler words and phrases using boundary-aware regex.
        Does not falsely match substrings within normal words (e.g., 'like' in 'likely').
        """
        if not transcript_text:
            return {"total_count": 0, "breakdown": {}}

        lower_text = transcript_text.lower()
        breakdown: Dict[str, int] = {}
        total_count = 0

        # Sort phrases by length descending to match multi-word phrases first ('you know' before 'you')
        sorted_phrases = sorted(self.filler_phrases, key=lambda p: len(p), reverse=True)

        # Temporary working copy of text
        temp_text = lower_text
        for phrase in sorted_phrases:
            # Word boundary regex for single words or phrases
            pattern = r"(?:\b|^)" + re.escape(phrase) + r"(?:\b|$)"
            matches = re.findall(pattern, temp_text)
            count = len(matches)
            if count > 0:
                breakdown[phrase] = count
                total_count += count
                # Replace matched phrases with whitespace to avoid double counting sub-words
                temp_text = re.sub(pattern, " ", temp_text)

        return {
            "total_count": total_count,
            "breakdown": breakdown
        }

    def compute_audio_silence_metrics(
        self, audio_path: str, silence_threshold_db: float = -35.0, min_pause_sec: float = 0.5
    ) -> Dict[str, float]:
        """
        Signal-processing analysis of raw WAV audio:
        Calculates exact duration, RMS silence ratio, pause frequency, and long-pause duration.
        """
        if not audio_path or not os.path.exists(audio_path):
            return {
                "duration": 0.0,
                "silence_ratio": 0.0,
                "pause_count": 0,
                "pause_frequency": 0.0,
                "long_pause_duration": 0.0,
            }

        try:
            samplerate, data = wavfile.read(audio_path)
        except Exception as e:
            print(f"Warning: could not read wav file {audio_path}: {e}")
            return {
                "duration": 0.0,
                "silence_ratio": 0.0,
                "pause_count": 0,
                "pause_frequency": 0.0,
                "long_pause_duration": 0.0,
            }

        # Convert to mono float in range [-1.0, 1.0]
        if data.ndim > 1:
            data = data.mean(axis=1)

        if data.dtype == np.int16:
            data = data.astype(np.float32) / 32768.0
        elif data.dtype == np.int32:
            data = data.astype(np.float32) / 2147483648.0
        else:
            data = data.astype(np.float32)

        total_samples = len(data)
        duration = total_samples / samplerate
        if duration <= 0:
            return {
                "duration": 0.0,
                "silence_ratio": 0.0,
                "pause_count": 0,
                "pause_frequency": 0.0,
                "long_pause_duration": 0.0,
            }

        # 50ms window analysis
        window_size = int(samplerate * 0.05)  # 50 ms
        if window_size == 0 or total_samples < window_size:
            return {
                "duration": round(duration, 2),
                "silence_ratio": 0.0,
                "pause_count": 0,
                "pause_frequency": 0.0,
                "long_pause_duration": 0.0,
            }

        num_windows = total_samples // window_size
        reshaped = data[: num_windows * window_size].reshape(num_windows, window_size)
        rms = np.sqrt(np.mean(reshaped ** 2, axis=1) + 1e-12)
        rms_db = 20 * np.log10(rms)

        # Silent windows
        is_silent = rms_db < silence_threshold_db
        silent_windows = int(np.sum(is_silent))
        total_silence_sec = (silent_windows * window_size) / samplerate
        silence_ratio = round(min(1.0, total_silence_sec / duration), 3)

        # Detect contiguous pause runs
        pauses: List[float] = []
        current_run = 0
        for silent in is_silent:
            if silent:
                current_run += 1
            else:
                if current_run > 0:
                    pause_sec = (current_run * window_size) / samplerate
                    if pause_sec >= min_pause_sec:
                        pauses.append(pause_sec)
                    current_run = 0
        if current_run > 0:
            pause_sec = (current_run * window_size) / samplerate
            if pause_sec >= min_pause_sec:
                pauses.append(pause_sec)

        pause_count = len(pauses)
        duration_minutes = duration / 60.0
        pause_frequency = round(pause_count / duration_minutes, 2) if duration_minutes > 0 else 0.0
        long_pause_duration = round(sum(p for p in pauses if p >= 1.5), 2)

        return {
            "duration": round(duration, 2),
            "silence_ratio": silence_ratio,
            "pause_count": pause_count,
            "pause_frequency": pause_frequency,
            "long_pause_duration": long_pause_duration,
        }

    def compute_metrics(
        self,
        transcript_text: str,
        audio_path: Optional[str] = None,
        override_duration: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Aggregate complete measurable speaking metrics.
        Combines signal-level audio acoustics with lexical analysis.
        """
        # Word tokenization
        words = re.findall(r"\b[\w'-]+\b", transcript_text or "")
        word_count = len(words)

        # Silence & pause measurements from audio
        audio_metrics = self.compute_audio_silence_metrics(audio_path or "")
        duration = override_duration or audio_metrics.get("duration") or 0.0

        if duration <= 0 and word_count > 0:
            # Fallback estimation only if audio is unavailable (assume avg speaking rate 130 WPM)
            duration = (word_count / 130.0) * 60.0

        duration_minutes = duration / 60.0 if duration > 0 else 0.0

        # WPM
        words_per_minute = round(word_count / duration_minutes, 1) if duration_minutes > 0 else 0.0

        # Filler word analytics
        filler_data = self.detect_filler_words(transcript_text)
        filler_count = filler_data["total_count"]
        filler_wpm = round(filler_count / duration_minutes, 2) if duration_minutes > 0 else 0.0

        return {
            "words_per_minute": words_per_minute,
            "answer_duration": round(duration, 2),
            "word_count": word_count,
            "filler_words_detected": filler_count,
            "filler_words_breakdown": filler_data["breakdown"],
            "filler_words_per_minute": filler_wpm,
            "pause_frequency": audio_metrics.get("pause_frequency", 0.0),
            "pause_count": audio_metrics.get("pause_count", 0),
            "long_pause_duration": audio_metrics.get("long_pause_duration", 0.0),
            "silence_ratio": audio_metrics.get("silence_ratio", 0.0),
        }


audio_analytics_engine = AudioAnalyticsEngine()
