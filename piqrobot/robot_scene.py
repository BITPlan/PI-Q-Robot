"""
Data-driven robot model for the NiceGUI 3D simulator.

This is the Python port of the original web/js/robot.js scene-graph loader.
A robot model is a recursive tree of parts. Each part has a position
(x, y, z), an euler rotation (rx, ry, rz) in degrees, an optional STL mesh
and optional nested parts. A part may carry a ``pivot`` which turns it into a
controllable joint that can be rotated about a single axis by a given angle.

Created on 2026-06-16

@author: wf
"""

import json
import math
import os
from dataclasses import dataclass, field
from typing import Dict, List, Optional


@dataclass
class Pivot:
    """A rotation joint of a part (see e.g. https://en.wikipedia.org/wiki/Pivot_joint)."""

    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    rx: float = 0.0
    ry: float = 0.0
    rz: float = 0.0
    radius: float = 0.0
    angle: float = 0.0
    axis: str = "y"

    @classmethod
    def from_json_obj(cls, o: dict) -> "Pivot":
        return cls(
            x=o.get("x", 0.0),
            y=o.get("y", 0.0),
            z=o.get("z", 0.0),
            rx=o.get("rx", 0.0),
            ry=o.get("ry", 0.0),
            rz=o.get("rz", 0.0),
            radius=o.get("radius", 0.0),
        )


@dataclass
class Part:
    """A part of a robot - possibly with an STL mesh, a pivot joint and subparts."""

    name: str
    stl: Optional[str] = None
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0
    rx: float = 0.0
    ry: float = 0.0
    rz: float = 0.0
    pivot: Optional[Pivot] = None
    parts: List["Part"] = field(default_factory=list)
    # filled in at scene build time
    group = None

    @classmethod
    def from_json_obj(cls, o: dict) -> "Part":
        part = cls(
            name=o.get("name"),
            stl=o.get("stl"),
            x=o.get("x", 0.0),
            y=o.get("y", 0.0),
            z=o.get("z", 0.0),
            rx=o.get("rx", 0.0),
            ry=o.get("ry", 0.0),
            rz=o.get("rz", 0.0),
        )
        if o.get("pivot"):
            part.pivot = Pivot.from_json_obj(o["pivot"])
        for sub in o.get("parts", []) or []:
            part.parts.append(cls.from_json_obj(sub))
        return part

    def walk(self):
        """Yield this part and all descendants depth first."""
        yield self
        for sub in self.parts:
            yield from sub.walk()


class Robot:
    """A robot consists of a name and a recursive list of parts."""

    def __init__(
        self,
        name: str,
        url: str = "",
        camera: Optional[dict] = None,
        positioning: str = "absolute",
        parts: Optional[List[Part]] = None,
    ):
        self.name = name
        self.url = url
        self.camera = camera
        self.positioning = positioning
        self.parts = parts or []
        self.parts_by_name: Dict[str, Part] = {}
        for part in self.all_parts():
            self.parts_by_name[part.name] = part

    @classmethod
    def from_json_obj(cls, robot_obj: dict) -> "Robot":
        parts = [Part.from_json_obj(p) for p in robot_obj.get("parts", [])]
        return cls(
            name=robot_obj.get("name", "robot"),
            url=robot_obj.get("url", ""),
            camera=robot_obj.get("camera"),
            positioning=robot_obj.get("positioning", "absolute"),
            parts=parts,
        )

    @classmethod
    def from_json_file(cls, json_path: str) -> "Robot":
        with open(json_path, "r", encoding="utf-8") as json_file:
            robot_obj = json.load(json_file)
        return cls.from_json_obj(robot_obj)

    def all_parts(self) -> List[Part]:
        """Return all parts of the robot recursively."""
        result: List[Part] = []
        for part in self.parts:
            result.extend(part.walk())
        return result

    def joints(self) -> List[Part]:
        """Return all parts that carry a pivot, i.e. controllable joints."""
        return [part for part in self.all_parts() if part.pivot is not None]

    @staticmethod
    def deg2rad(deg: float) -> float:
        return deg * math.pi / 180.0

    def build_scene(self, scene, stl_base_url: str = "", scale: float = 1.0):
        """Build the NiceGUI scene graph for this robot.

        Args:
            scene: a nicegui ui.scene instance (used as the group factory)
            stl_base_url: URL prefix under which the STL files are served
            scale: uniform scale to apply to the whole robot
        """

        def add_part(part: Part, factory):
            # a group holding the part - this is what a joint rotates
            group = factory.group()
            group.move(part.x * scale, part.y * scale, part.z * scale)
            group.rotate(
                self.deg2rad(part.rx),
                self.deg2rad(part.ry),
                self.deg2rad(part.rz),
            )
            part.group = group
            if part.stl:
                stl_url = part.stl
                if stl_base_url and not stl_url.startswith("http"):
                    stl_url = stl_base_url.rstrip("/") + "/" + stl_url.lstrip("/")
                with group:
                    mesh = factory.stl(stl_url)
                    mesh.scale(scale)
            # recurse into subparts within this group's context
            with group:
                for sub in part.parts:
                    add_part(sub, factory)

        for part in self.parts:
            add_part(part, scene)

    def set_joint_angle(self, name: str, angle: float):
        """Rotate the named joint about its pivot axis by the given angle (degrees)."""
        part = self.parts_by_name.get(name)
        if not part or not part.pivot or part.group is None:
            return
        axis = part.pivot.axis
        rad = self.deg2rad(angle)
        rx = part.rx
        ry = part.ry
        rz = part.rz
        if axis == "x":
            rx = part.rx + angle
        elif axis == "z":
            rz = part.rz + angle
        else:
            ry = part.ry + angle
        part.pivot.angle = angle
        part.group.rotate(
            self.deg2rad(rx),
            self.deg2rad(ry),
            self.deg2rad(rz),
        )

    @staticmethod
    def models_dir() -> str:
        """Return the absolute path to the bundled web/models directory."""
        here = os.path.dirname(os.path.abspath(__file__))
        # web assets live alongside the original Flask app at the repo root
        path = os.path.join(here, "..", "web", "models")
        return os.path.abspath(path)
