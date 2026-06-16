"""
Version handling for PI-Q-Robot
"""

from dataclasses import dataclass

import piqrobot


@dataclass
class Version(object):
    """
    Version handling for PI-Q-Robot
    """

    name = "pi-q-robot"
    version = piqrobot.__version__
    date = "2019-07-27"
    updated = "2026-06-16"
    description = "Raspberry PI controlled Quadruped Robot with 3D Simulator."

    authors = "Wolfgang Fahl"

    doc_url = "http://wiki.bitplan.com/index.php/Raspberry_PI_Spiderbot"
    chat_url = "https://github.com/BITPlan/PI-Q-Robot/discussions"
    cm_url = "https://github.com/BITPlan/PI-Q-Robot"

    license = """Copyright 2019-2026 contributors. All rights reserved.

  Licensed under the Apache License 2.0
  http://www.apache.org/licenses/LICENSE-2.0

  Distributed on an "AS IS" basis without warranties
  or conditions of any kind, either express or implied."""
    longDescription = f"""{name} version {version}
{description}

  Created by {authors} on {date} last updated {updated}"""
