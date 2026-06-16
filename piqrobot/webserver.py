"""
NiceGUI / ngwidgets web server for PI-Q-Robot.

Ports the original Flask + custom three.js simulator (web/js/robot.js) to the
ngwidgets InputWebserver / InputWebSolution pattern using a NiceGUI ui.scene.
The robot geometry is data driven from the JSON models in web/models and the
STL meshes are served as static files - both reused unchanged.

Created on 2026-06-16

@author: wf
"""

import json
import os
from typing import Optional

from fastapi.responses import HTMLResponse
from ngwidgets.input_webserver import InputWebserver, InputWebSolution
from ngwidgets.webserver import WebserverConfig
from nicegui import Client, app, ui

from piqrobot.robot_scene import Robot
from piqrobot.version import Version


class PiQRobotWebServer(InputWebserver):
    """WebServer managing the PI-Q-Robot 3D simulator."""

    @classmethod
    def get_config(cls) -> WebserverConfig:
        copy_right = "(c)2019-2026 Wolfgang Fahl"
        config = WebserverConfig(
            copy_right=copy_right,
            version=Version(),
            default_port=5002,
            short_name="pi-q-robot",
        )
        server_config = WebserverConfig.get(config)
        server_config.solution_class = PiQRobotSolution
        return server_config

    def __init__(self):
        """Construct the PI-Q-Robot webserver."""
        InputWebserver.__init__(self, config=PiQRobotWebServer.get_config())
        # serve the existing static web assets (models, stl, css, js)
        web_dir = PiQRobotWebServer.web_path()
        if os.path.isdir(web_dir):
            app.add_static_files("/models", os.path.join(web_dir, "models"))
            app.add_static_files("/js", os.path.join(web_dir, "js"))
            app.add_static_files("/css", os.path.join(web_dir, "css"))

        @app.get("/example/{example}")
        def show_example(example: str):
            """Serve a standalone three.js demo page (cubes, robot, shadow)."""
            return PiQRobotWebServer.render_example(example)

    @classmethod
    def examples_path(cls) -> str:
        here = os.path.dirname(os.path.abspath(__file__))
        return os.path.abspath(os.path.join(here, "..", "examples"))

    # scripts shared by every three.js demo page (formerly templates/js.html)
    DEMO_SCRIPTS = [
        "https://cdnjs.cloudflare.com/ajax/libs/three.js/107/three.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/dat-gui/0.7.6/dat.gui.min.js",
        "/js/libs/stats.min.js",
        "/js/exporters/GLTFExporter.js",
        "/js/controls/TrackballControls.js",
        "/js/controls/OrbitControls.js",
        "/js/controls/DragControls.js",
        "/js/STLLoader.js",
        "/js/three_basics.js",
        "/js/three-setup.js",
        "/js/robot.js",
    ]

    @classmethod
    def render_example(cls, example: str) -> HTMLResponse:
        """Render the three.js demo page for the given example name.

        Replaces the old Flask /example/<name> route + templates/trial.html.
        Reads examples/<name>.json ({title, js}) and emits a minimal HTML
        shell that loads the shared three.js libs and the demo script.
        """
        json_file = os.path.join(cls.examples_path(), f"{example}.json")
        if not os.path.isfile(json_file):
            return HTMLResponse(content=f"unknown example {example}", status_code=404)
        with open(json_file, "r", encoding="utf-8") as fh:
            example_obj = json.load(fh)
        title = example_obj.get("title", example)
        demo_js = example_obj.get("js", "")
        scripts = "\n    ".join(f"<script src='{src}'></script>" for src in cls.DEMO_SCRIPTS)
        html = f"""<!DOCTYPE html>
<html lang='en'>
  <head>
    <meta charset=utf-8>
    <meta name="viewport" content="width=device-width, user-scalable=no, minimum-scale=1.0, maximum-scale=1.0">
    <link type="text/css" rel="stylesheet" href="/css/main.css">
    <title>{title}</title>
    <style>html, body {{ margin: 0; padding: 0; overflow: hidden; }}</style>
  </head>
  <body>
    {scripts}
    <script src='{demo_js}'></script>
  </body>
</html>"""
        return HTMLResponse(content=html)

    @classmethod
    def web_path(cls) -> str:
        here = os.path.dirname(os.path.abspath(__file__))
        return os.path.abspath(os.path.join(here, "..", "web"))

    @classmethod
    def models_path(cls) -> str:
        return Robot.models_dir()

    def configure_run(self):
        root_path = self.args.root_path if self.args.root_path else PiQRobotWebServer.models_path()
        self.root_path = os.path.abspath(root_path)


class PiQRobotSolution(InputWebSolution):
    """The PI-Q-Robot solution: a 3D robot simulator with per-joint sliders."""

    def __init__(self, webserver: PiQRobotWebServer, client: Client):
        super().__init__(webserver, client)
        self.do_trace = True
        self.robot: Optional[Robot] = None
        self.scene = None
        self.default_model = "spiderq"

    def load_robot(self, model_name: str):
        """Load a robot model JSON from web/models/<model_name>.json."""
        try:
            json_path = os.path.join(PiQRobotWebServer.models_path(), f"{model_name}.json")
            self.robot = Robot.from_json_file(json_path)
            ui.notify(f"loaded {self.robot.name} ({len(self.robot.all_parts())} parts)")
        except BaseException as ex:
            self.handle_exception(ex, self.do_trace)

    def build_scene(self):
        """(Re)build the 3D scene and the joint control sliders."""
        if self.robot is None:
            return
        self.scene.clear()
        with self.scene:
            self.scene.spot_light(distance=400, intensity=0.3).move(-100, 0, 100)
            self.robot.build_scene(self.scene, stl_base_url="", scale=0.1)

    def on_joint_change(self, part_name: str, event):
        """React on a joint slider change by rotating the joint group."""
        try:
            angle = float(event.value)
            if self.robot:
                self.robot.set_joint_angle(part_name, angle)
        except BaseException as ex:
            self.handle_exception(ex, self.do_trace)

    def setup_ui(self):
        """Set up the simulator UI: model selector, 3D scene and joint sliders."""
        models_dir = PiQRobotWebServer.models_path()
        model_names = []
        if os.path.isdir(models_dir):
            model_names = sorted(os.path.splitext(f)[0] for f in os.listdir(models_dir) if f.endswith(".json"))
        self.load_robot(self.default_model)
        with ui.row():
            ui.select(
                model_names,
                value=self.default_model if self.default_model in model_names else None,
                label="model",
                on_change=lambda e: self.on_model_change(e.value),
            ).props("outlined")
        with ui.splitter().classes("w-full") as splitter:
            with splitter.before:
                with ui.scene(width=1024, height=600).classes("w-full") as scene:
                    self.scene = scene
                self.build_scene()
            with splitter.after:
                self.joints_container = ui.column().classes("w-full")
                self.build_joint_controls()

    def build_joint_controls(self):
        """Create one slider per controllable joint."""
        self.joints_container.clear()
        if self.robot is None:
            return
        with self.joints_container:
            ui.label("Joints").classes("text-lg font-bold")
            for joint in self.robot.joints():
                with ui.row().classes("items-center w-full"):
                    ui.label(joint.name).classes("w-40")
                    ui.slider(
                        min=-180,
                        max=180,
                        value=0,
                        on_change=lambda e, n=joint.name: self.on_joint_change(n, e),
                    ).classes("w-64")

    def on_model_change(self, model_name: str):
        """Switch the displayed robot model."""
        if not model_name:
            return
        self.load_robot(model_name)
        self.build_scene()
        self.build_joint_controls()

    async def home(self):
        """Render the home page with the 3D simulator."""

        def show():
            self.setup_ui()

        await self.setup_content_div(show)
