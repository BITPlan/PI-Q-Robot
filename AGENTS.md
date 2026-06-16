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
pi-q-robot.py        # Flask app, REST API and robot domain model
web/                 # static frontend (3D simulator, models, JS)
templates/           # Jinja2 templates (index.html, trial.html, ...)
examples/            # example robot definitions (*.json)
install              # install prerequisites (port/apt + pip)
run                  # start server/client (port 5002)
gn                   # helper: move latest SpiderQ*.json into web/models
requirements.txt     # legacy deps (superseded by pyproject.toml)
```

## Key Classes (pi-q-robot.py)
- `Servo` — a single servo motor; `setAngle` honors inversion and simulated move timing; registry in `Servo.servos`
- `Extremity` — a coxa, femur or tibia; wraps one `Servo`
- `Leg` — coxa + femur + tibia; `stand(step)` and `sit()` pose helpers
- `Spider` — quadruped with four `Leg`s (fl, fr, rl, rr); `stand()` and `sit()`

## REST / Routes (Flask)
- `GET  /` — index page with available actions
- `GET  /example/<example>` — render example robot definition from examples/<example>.json
- `GET  /servo/<servoId>/<angle>` — set a servo angle
- `POST /action` — perform an action (stand, sit, ...)

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
