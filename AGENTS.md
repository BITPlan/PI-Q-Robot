# AGENTS

## PLAN AND ASK BEFORE DO
CRITICAL: NEVER EVER DO ANY ACTION READING, MODIFYING OR RUNNING without explaining the plan
Each set of intended actions needs to be explained in the format:
I understood that <YOUR ANALYSIS> so that i plan to <GOALS YOU PURSUE> by <ACTIONS TO BE CONFIRMED> estimating <# of ITEMS> <ITEMS> to be worked on. confirm with go!
YOU WILL NEVER PROCEED WITHOUT POSITIVE CONFIRMATION by go!

## Efficiency
* Do NOT do unneeded file lookups based on guessing or assuming typos.
* Do NOT use TodoWrite for tasks with fewer than 4 steps.
* Do NOT read files you already have contents for.
* Keep summaries to 2-3 lines max unless asked for detail.
* Minimize tool calls. Batch parallel calls. Avoid redundant calls.

## SECURITY
CRITICAL: NEVER leak credentials, passwords, hashes, internal hostnames, IPs, or any infrastructure details to public platforms (GitHub, Discourse, etc.). Firing offense.

## Project: PI-Q-Robot
Raspberry PI controlled Quadruped Robot with 3D Simulator.
- Python: >=3.10
- License: Apache-2.0
- Source: https://github.com/BITPlan/PI-Q-Robot
- Wiki: http://wiki.bitplan.com/index.php/Raspberry_PI_Spiderbot
- Demo: http://pi-q-robot.bitplan.com/

## Structure
```
piqrobot/            # the NiceGUI/ngwidgets application package
  __init__.py        # version string
  version.py         # Version metadata
  cmd.py             # CLI entry point (pi-q-robot)
  webserver.py       # PiQRobotWebServer/PiQRobotSolution (ui.scene + joint sliders)
  robot_scene.py     # data-driven JSON->ui.scene walker (Part/Pivot/Robot)
  servo.py           # Servo/Extremity/Leg/Spider hardware domain model
web/models/          # robot model definitions (*.json) + STL meshes
web/js, web/css      # three.js demo assets (served for /example/<name>)
examples/            # three.js demo stubs (cubes, robot, shadow)
install              # install prerequisites (port/apt + pip install .)
run                  # start server/client (port 5002)
gn                   # helper: move latest SpiderQ*.json into web/models
```

## Key Classes
- `piqrobot.servo`: `Servo` (single motor, `setAngle` honors inversion/sim timing), `Extremity`, `Leg` (`stand`/`sit`), `Spider` (four legs fl,fr,rl,rr)
- `piqrobot.robot_scene`: `Part`/`Pivot`/`Robot` — load a robot model JSON into a nested `ui.scene` group hierarchy; `set_joint_angle` rotates a joint
- `piqrobot.webserver`: `PiQRobotWebServer` (ngwidgets `InputWebserver`) + `PiQRobotSolution` (3D simulator UI)

## Routes (NiceGUI/ngwidgets)
- `/` — 3D robot simulator (model selector + ui.scene + per-joint sliders)
- `GET /example/<example>` — standalone three.js demo page from examples/<example>.json
- static: `/models`, `/js`, `/css`

Servo hardware via `adafruit_servokit` only on Raspberry PI; otherwise servos are simulated.

## Running
```bash
./install   # install prerequisites
./run       # start client mode (opens http://localhost:5002)
./run -s    # start server only
```

## Testing
```bash
python -m pytest tests/
```

## Build & Format
```bash
black .     # format (line-length 120)
isort .     # sort imports
```
