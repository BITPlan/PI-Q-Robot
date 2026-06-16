"""
Tests for PI-Q-Robot
"""

import os
import unittest

from piqrobot.robot_scene import Robot
from piqrobot.version import Version


class TestVersion(unittest.TestCase):
    """Test the Version metadata."""

    def test_version(self):
        """version name and string are set."""
        self.assertEqual(Version.name, "pi-q-robot")
        self.assertTrue(len(Version.version) > 0)


class TestRobotScene(unittest.TestCase):
    """Test the data driven robot model."""

    def get_model_path(self, name: str) -> str:
        return os.path.join(Robot.models_dir(), f"{name}.json")

    def test_load_spiderq(self):
        """spiderq model loads into a part hierarchy with joints."""
        path = self.get_model_path("spiderq")
        if not os.path.isfile(path):
            self.skipTest("spiderq.json model not available")
        robot = Robot.from_json_file(path)
        self.assertEqual(robot.name, "SpiderQ")
        parts = robot.all_parts()
        self.assertGreater(len(parts), 0)
        # every part is resolvable by name
        for part in parts:
            self.assertIn(part.name, robot.parts_by_name)

    def test_deg2rad(self):
        """degree to radian conversion is correct."""
        self.assertAlmostEqual(Robot.deg2rad(180), 3.141592653589793, places=6)


if __name__ == "__main__":
    unittest.main()
