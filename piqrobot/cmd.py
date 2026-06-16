"""
Command line handling for PI-Q-Robot.

Created on 2026-06-16

@author: wf
"""

import sys
from argparse import ArgumentParser

from ngwidgets.cmd import WebserverCmd

from piqrobot.webserver import PiQRobotWebServer


class PiQRobotCmd(WebserverCmd):
    """
    command line handling for PI-Q-Robot
    """

    def __init__(self):
        """
        constructor
        """
        config = PiQRobotWebServer.get_config()
        WebserverCmd.__init__(self, config, PiQRobotWebServer, DEBUG)

    def getArgParser(self, description: str, version_msg) -> ArgumentParser:
        """
        override the default argparser call
        """
        parser = super().getArgParser(description, version_msg)
        parser.add_argument(
            "-rp",
            "--root_path",
            default=PiQRobotWebServer.models_path(),
            help="path to robot model json files [default: %(default)s]",
        )
        return parser


def main(argv: list = None):
    """
    main call
    """
    cmd = PiQRobotCmd()
    exit_code = cmd.cmd_main(argv)
    return exit_code


DEBUG = 0
if __name__ == "__main__":
    if DEBUG:
        sys.argv.append("-d")
    sys.exit(main())
