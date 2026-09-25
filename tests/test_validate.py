# -*- coding: utf-8 -*-
"""
校验器自测。运行：python -m unittest discover -s tests -v
覆盖：官方案例与本仓库案例零错误；典型错误能被对应的错误码抓到。
"""
import os
import sys
import unittest

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(ROOT, "tools"))

import validate_prompt as vp  # noqa: E402

T2VA_OK = """integrated_multimodal_description: [Shot 1] Live-action, cinematic, a medium-wide shot frames a baker opening the shutters of a small street bakery before sunrise. The camera pushes in with small amplitude at slow speed as the middle-aged baker with a calm, slightly raspy voice (S1) places a fresh loaf on the wooden counter and says: <d>[English] First batch of the morning.</d> [Shot 2] At 00:05.000, the camera cuts to a close-up of steam rising from the sliced bread while the baker's final words carry over from the previous shot.

overall_soundscape: Wooden shutters scrape open over a quiet street as trays clink softly inside the bakery. The doorbell rings once, followed by light footsteps and the crisp sound of bread being sliced.

non_diegetic_music: A soft acoustic-guitar pattern at a moderate tempo, joined by sparse upright-bass notes and a gentle fade at the end.
"""

I2VA_OK = """For the target video, at 0.00 seconds into the target video, <Picture 1> (from [Shot 1]) is fully referenced.

integrated_multimodal_description: [Shot 1] Live-action, cinematic, the young woman shown in <Picture 1> remains beside the rain-covered train window, preserving her appearance, clothing, seat position, and the carriage layout. The camera trucks right with small amplitude at slow speed as she lifts her gaze from the folded letter toward the passing city lights. Her reflection moves across the glass while the quiet, breathy young woman (S1) says: <d>[English] I get off at the next station.</d> She folds the letter along its existing crease.

overall_soundscape: The train wheels produce a steady metallic rhythm beneath a low ventilation hum. Rain ticks against the window while paper rustles softly in her hands.

non_diegetic_music: Sustained cello notes at a slow tempo with widely spaced piano tones, gradually decreasing in volume.
"""

FL2VA_OK = """How the reference pictures align with the target video — Picture 1 (from Shot 1) aligns with the 0.00-second mark of the target video; Picture 2 (from Shot 1) aligns with the 8.00-second mark of the target video.

integrated_multimodal_description: [Shot 1] Live-action, cinematic, a rain-soaked cyclist begins in the position and framing established by Picture 1, holding a closed black umbrella beside a silver bicycle. The camera pulls out with small amplitude at slow speed as she releases the bicycle handle, raises the umbrella above her shoulder, and presses the runner upward until the canopy opens. Water rolls from the expanding fabric while she steps beneath it, rotates the handle into the final angle, and settles into the pose, spacing, and composition established by Picture 2 at the end of the shot.

overall_soundscape: Rain falls steadily on the pavement, followed by the metallic click of the umbrella runner and the soft snap of the canopy opening. Water drips from the bicycle frame as distant traffic passes.

non_diegetic_music: N/A
"""


def codes(text, duration=None, mode=None):
    rep = vp.validate_text(text, "<inline>", duration, mode)
    return rep, {i.code for i in rep.issues if i.level == "ERROR"}, {i.code for i in rep.issues if i.level == "WARN"}


class OfficialAndRepoExamples(unittest.TestCase):
    def test_inline_official_cases_pass(self):
        for txt, dur, mode in ((T2VA_OK, 7, "T2VA"), (I2VA_OK, 6, "I2VA"), (FL2VA_OK, 8, "FL2VA")):
            rep, errs, warns = codes(txt, dur)
            self.assertEqual(rep.mode, mode)
            self.assertEqual(errs, set(), f"{mode}: {errs}")
            self.assertEqual(warns, set(), f"{mode}: {warns}")

    def test_repo_examples_strict_pass(self):
        files = vp.collect_files([os.path.join(ROOT, "examples")])
        self.assertGreaterEqual(len(files), 10)
        for f in files:
            with open(f, encoding="utf-8") as fh:
                rep = vp.validate_text(fh.read(), f, vp.detect_duration(f, None), None)
            self.assertEqual(rep.errors, 0, f"{f}: {[i.msg for i in rep.issues if i.level == 'ERROR']}")
            self.assertEqual(rep.warnings, 0, f"{f}: {[i.msg for i in rep.issues if i.level == 'WARN']}")


class BaseModeErrors(unittest.TestCase):
    def test_missing_field_and_order(self):
        bad = T2VA_OK.replace("non_diegetic_music:", "music:")
        _, errs, warns = codes(bad, 7)
        self.assertIn("E_FIELD_MISSING", errs)
        bad2 = T2VA_OK.split("\n\n")
        swapped = "\n\n".join([bad2[0], bad2[2], bad2[1]])
        _, errs, _ = codes(swapped, 7)
        self.assertIn("E_FIELD_ORDER", errs)

    def test_shot1_timestamp_and_bad_timestamp(self):
        bad = T2VA_OK.replace("[Shot 1] Live-action", "[Shot 1] At 00:00.000, Live-action")
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_SHOT1_TIMESTAMP", errs)
        bad = T2VA_OK.replace("[Shot 2] At 00:05.000,", "[Shot 2] At 5s,")
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_SHOT_TIMESTAMP", errs)

    def test_shot_order_and_duration(self):
        bad = T2VA_OK + ""
        bad = bad.replace("[Shot 2] At 00:05.000,", "[Shot 2] At 00:05.000, the camera cuts to a wide shot. [Shot 3] At 00:04.000,")
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_SHOT_ORDER", errs)
        _, errs, _ = codes(T2VA_OK, 5)
        self.assertIn("E_SHOT_BEYOND_DURATION", errs)

    def test_shot_numbering(self):
        bad = T2VA_OK.replace("[Shot 2]", "[Shot 3]")
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_SHOT_NUMBERING", errs)

    def test_dialogue_rules(self):
        bad = T2VA_OK.replace("<d>[English] First batch of the morning.</d>", "<d>First batch of the morning.</d>")
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_D_NO_LANG", errs)
        bad = T2VA_OK.replace("<d>[English] First batch of the morning.</d>", "<d>[English] (S1) First batch of the morning.</d>")
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_D_SPEAKER_INSIDE", errs)
        bad = T2VA_OK.replace("</d>", "")
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_D_UNBALANCED", errs)

    def test_voiceover_needs_phrase_and_lips(self):
        vo = T2VA_OK.replace("(S1) places a fresh loaf on the wooden counter and says:", "(S1) says in a voiceover:")
        _, _, warns = codes(vo, 7)
        self.assertIn("W_VO_PHRASE", warns)
        self.assertIn("W_VO_LIPS", warns)
        ok = T2VA_OK.replace(
            "(S1) places a fresh loaf on the wooden counter and says: <d>[English] First batch of the morning.</d>",
            "(S1) says in an off-screen voiceover: <d>[English] First batch of the morning.</d> while his lips remain completely closed.",
        )
        _, _, warns = codes(ok, 7)
        self.assertNotIn("W_VO_PHRASE", warns)
        self.assertNotIn("W_VO_LIPS", warns)

    def test_music_and_soundscape_rules(self):
        bad = T2VA_OK.replace("A soft acoustic-guitar pattern at a moderate tempo", "A sad, emotional acoustic-guitar pattern at a moderate tempo")
        _, _, warns = codes(bad, 7)
        self.assertIn("W_MUSIC_MOOD", warns)
        bad = T2VA_OK.replace("overall_soundscape: Wooden", "overall_soundscape: <d>[English] hi</d> Wooden")
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_SOUND_HAS_D", errs)

    def test_non_english_and_negative(self):
        bad = T2VA_OK.replace("a medium-wide shot frames a baker", "一个中景 frames a baker")
        _, _, warns = codes(bad, 7)
        self.assertIn("W_NON_ENGLISH", warns)
        bad = T2VA_OK.replace("frames a baker", "frames a baker, no watermark,")
        _, _, warns = codes(bad, 7)
        self.assertIn("W_NEGATIVE_PROMPT", warns)

    def test_too_long(self):
        bad = T2VA_OK.replace("frames a baker", "frames a baker " + "very " * 1500)
        _, errs, _ = codes(bad, 7)
        self.assertIn("E_TOO_LONG", errs)


class KeyframeModes(unittest.TestCase):
    def test_i2va_exact_line(self):
        bad = I2VA_OK.replace("<Picture 1> (from [Shot 1])", "Picture 1 (from Shot 1)")
        rep, errs, _ = codes(bad, 6)
        self.assertEqual(rep.mode, "I2VA")
        self.assertIn("E_ALIGN_FORMAT", errs)

    def test_fl2va_brackets_and_dash(self):
        bad = FL2VA_OK.replace("Picture 1 (from Shot 1)", "<Picture 1> (from [Shot 1])")
        _, errs, _ = codes(bad, 8)
        self.assertIn("E_ALIGN_FORMAT", errs)
        bad = FL2VA_OK.replace(" — ", " - ")
        _, errs, _ = codes(bad, 8)
        self.assertIn("E_ALIGN_FORMAT", errs)

    def test_fl2va_duration_and_shot_n(self):
        _, errs, _ = codes(FL2VA_OK, 6)
        self.assertIn("E_ALIGN_DURATION", errs)
        bad = FL2VA_OK.replace("Picture 2 (from Shot 1)", "Picture 2 (from Shot 2)")
        _, errs, _ = codes(bad, 8)
        self.assertIn("E_ALIGN_SHOT_N", errs)

    def test_l2va(self):
        body = FL2VA_OK.split("\n", 1)[1]
        body = body.replace("Picture 1", "<Picture 1>").replace("Picture 2", "<Picture 1>")
        l2 = "How the reference pictures align with the target video — <Picture 1> (from [Shot 1]) aligns with the 8.00-second mark of the target video.\n" + body
        rep, errs, _ = codes(l2, 8)
        self.assertEqual(rep.mode, "L2VA")
        self.assertEqual(errs, set())

    def test_blank_line_after_alignment(self):
        bad = I2VA_OK.replace("referenced.\n\n", "referenced.\n")
        _, _, warns = codes(bad, 6)
        self.assertIn("W_ALIGN_BLANK", warns)


class Ref2VAMode(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        p = os.path.join(ROOT, "examples", "ref2va", "01-character-night-market-zh-10s.txt")
        with open(p, encoding="utf-8") as fh:
            cls.ok = fh.read()

    def test_ok(self):
        rep, errs, warns = codes(self.ok, 10)
        self.assertEqual(rep.mode, "REF2VA")
        self.assertEqual(errs, set())
        self.assertEqual(warns, set())

    def test_undefined_label(self):
        bad = self.ok.replace("follows <Subject 1> from the front", "follows <Subject 9> from the front")
        _, errs, _ = codes(bad, 10)
        self.assertIn("E_LABEL_UNDEFINED", errs)

    def test_summary_prefix(self):
        bad = self.ok.replace("[reference generation]", "[character reference]")
        _, errs, _ = codes(bad, 10)
        self.assertIn("E_SUMMARY_TASK", errs)
        bad = self.ok.replace("[reference generation] ", "")
        _, errs, _ = codes(bad, 10)
        self.assertIn("E_SUMMARY_PREFIX", errs)

    def test_retention_marker_sets(self):
        bad = self.ok.replace("[Shot 3]): fully_preserved - the mole", "[Shot 3]): fully_copy - the mole")
        _, errs, _ = codes(bad, 10)
        self.assertIn("E_RETENTION_MARKER", errs)
        bad = self.ok.replace("<Subject 1> (appears in [Shot 1], [Shot 2], [Shot 3]): fully_preserved", "<Subject 1> (S1) (appears in [Shot 1], [Shot 2], [Shot 3]): fully_preserved")
        _, errs, _ = codes(bad, 10)
        self.assertIn("E_RETENTION_SPEAKER", errs)

    def test_section_order(self):
        parts = self.ok.split("summary:\n")
        swapped = parts[0].replace("subject_definitions:\n", "summary:\n[reference generation] x.\n\nsubject_definitions:\n", 1) + parts[1].split("\n\n", 1)[1]
        _, errs, _ = codes(swapped, 10)
        self.assertTrue({"E_FIELD_ORDER", "E_FIELD_DUP", "E_REF_START"} & errs)

    def test_lipsync_marker_hint(self):
        p = os.path.join(ROOT, "examples", "ref2va", "02-lipsync-song-audio-8s.txt")
        with open(p, encoding="utf-8") as fh:
            txt = fh.read()
        bad = txt.replace("<Audio 1>: fully_copy -", "<Audio 1>: reference -")
        _, _, warns = codes(bad, 8)
        self.assertIn("W_LIPSYNC_MARKER", warns)


class Detection(unittest.TestCase):
    def test_duration_from_filename(self):
        self.assertEqual(vp.detect_duration("x/foo-8s.txt", None), 8.0)
        self.assertEqual(vp.detect_duration("x/foo-5.17s.txt", None), 5.17)
        self.assertEqual(vp.detect_duration("x/foo.txt", None), None)
        self.assertEqual(vp.detect_duration("x/foo-8s.txt", 6), 6)

    def test_mode_detection(self):
        self.assertEqual(vp.detect_mode(T2VA_OK), "T2VA")
        self.assertEqual(vp.detect_mode(I2VA_OK), "I2VA")
        self.assertEqual(vp.detect_mode(FL2VA_OK), "FL2VA")
        self.assertEqual(vp.detect_mode("subject_definitions:\n<Subject 1> is x.\n"), "REF2VA")


if __name__ == "__main__":
    unittest.main()
