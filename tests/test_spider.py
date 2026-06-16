"""
Tests for PI-Q-Robot
"""

import unittest

from piqrobot.version import Version


class TestVersion(unittest.TestCase):
    """Test the Version metadata."""

    def test_version(self):
        """version name and string are set."""
        self.assertEqual(Version.name, "pi-q-robot")
        self.assertTrue(len(Version.version) > 0)


if __name__ == "__main__":
    unittest.main()
