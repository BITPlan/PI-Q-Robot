"""
Servo domain model for PI-Q-Robot.

Ported from the original Flask app pi-q-robot.py. Provides the Servo /
Extremity / Leg / Spider hierarchy used to drive the quadruped. Servo
hardware is accessed via adafruit_servokit only on a Raspberry PI; otherwise
the servos are simulated.

Created on 2019-07
@author: wf
"""

import os
import platform
import time

# prepare the adafruit servo access - only available on a Raspberry PI
if platform.system() == "Linux" and os.path.exists("/sys/firmware/devicetree/base/model"):
    from adafruit_servokit import ServoKit

    kit = ServoKit(channels=16)
else:
    kit = None


class Servo:
    """I am a single Servo motor."""

    debug = True
    servos = {}

    def __init__(self, id, name, inverted=False, speed=0.1 / 60):
        self.id = id
        self.name = name
        self.inverted = inverted
        # secs per degree
        self.speed = speed
        # we assume we start in a middle position
        self.angle = 90
        Servo.servos[self.id] = self

    def setAngle(self, angle):
        trueAngle = 180 - angle if self.inverted else angle
        if kit is not None:
            kit.servo[self.id].angle = trueAngle
            movedAngle = abs(angle - self.angle)
            moveTimeSecs = movedAngle * self.speed
            if Servo.debug:
                print(
                    "waiting %.0f msecs for servo %d: %s to move from %d to %d"
                    % (moveTimeSecs * 1000, self.id, self.name, self.angle, angle)
                )
            time.sleep(moveTimeSecs)
        self.angle = angle
        return trueAngle


class Extremity:
    """I am a single extremity of the spider e.g. coxa, femur or tibia of one of the legs."""

    def __init__(self, name, id, inverted=False):
        self.name = name
        self.servo = Servo(id, self.name, inverted)

    def setAngle(self, angle):
        self.servo.setAngle(angle)


class Leg:
    """I am a single leg of the spider consisting of coxa, femur and tibia."""

    def __init__(self, legId, coxaId, femurId, tibiaId):
        self.legId = legId
        self.coxa = Extremity("coxa leg %d" % legId, coxaId)
        self.femur = Extremity("femur leg %d" % legId, femurId, legId < 2)
        self.tibia = Extremity("tibia leg %d" % legId, tibiaId, legId < 2)

    def stand(self, step):
        if step == 0:
            self.coxa.setAngle(90)
            self.femur.setAngle(45)  # slightly up
            self.tibia.setAngle(120)  # slightly up
        elif step == 1:
            self.femur.setAngle(60)  # slightly up
            self.tibia.setAngle(90)  # slightly up

    def sit(self):
        self.coxa.setAngle(90)  # 45
        self.femur.setAngle(90)  # flat
        self.tibia.setAngle(150)  # flat


class Spider:
    """I am a quadruped spider with four legs consisting of coxa, femur and tibia each."""

    def __init__(self):
        self.fl = Leg(0, 0, 1, 2)
        self.fr = Leg(1, 3, 4, 5)
        self.rl = Leg(2, 6, 7, 8)
        self.rr = Leg(3, 9, 10, 11)

    def stand(self):
        for step in range(2):
            self.fl.stand(step)
            self.fr.stand(step)
            self.rl.stand(step)
            self.rr.stand(step)

    def sit(self):
        self.fl.sit()
        self.fr.sit()
        self.rl.sit()
        self.rr.sit()
