# Spider
# WF 2019-07
# WF 2020-01
from flask import Flask, request, render_template, send_from_directory, abort
from flask_restful import Resource, Api
import json
import sys
import time
import yaml
import platform
import os.path

# check if we are running on a raspberry PI
# https://raspberrypi.stackexchange.com/questions/5100/detect-that-a-python-program-is-running-on-the-pi
print("Running on %s" % (platform.system()))

# prepare the adafruit servo access
if platform.system() == 'Linux' and os.path.exists('/sys/firmware/devicetree/base/model'):
    from adafruit_servokit import ServoKit
    kit = ServoKit(channels=16)
else:
    print("Servos simulated")
    kit = None

# prepare the RESTful application

# prepare static webserver
# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_url_path='', static_folder='web')
api = Api(app)

class Servo:
    """ I am a single Servo motor """
    debug=True
    servos={}

    def __init__(self, id,name,inverted=False,speed=0.1/60):
        self.id = id
        self.name=name
        self.inverted=inverted
        # secs per degree
        self.speed=speed
        # we assume we start in a middle position
        self.angle=90
        Servo.servos[self.id]=self

    def setAngle(self, angle):
        trueAngle=180-angle if self.inverted else angle
        if kit is not None:
            # set the trueAngle
            kit.servo[self.id].angle = trueAngle
            movedAngle=abs(angle-self.angle)
            moveTimeSecs=movedAngle*self.speed
            if Servo.debug:
                print("waiting %.0f msecs for servo %d: %s to move from %d to %d" % (moveTimeSecs*1000,self.id,self.name,self.angle,angle))
            time.sleep(moveTimeSecs)
        self.angle = angle
        return trueAngle

class Extremity:
    """ I am a single extrimity of the spider  e.g. coxa, femur or tibia of one of the legs"""
    def __init__(self, name, id,inverted=False):
        self.name = name
        self.servo = Servo(id,self.name,inverted)

    def setAngle(self, angle):
        self.servo.setAngle(angle)

class Leg:
    """ I am a single leg of the spider consisting of coxa, femur and tibia"""
    def __init__(self, legId,coxaId, femurId, tibiaId):
        self.legId=legId
        self.coxa = Extremity('coxa leg %d' % legId, coxaId)
        self.femur = Extremity('femur leg %d' % legId, femurId,legId<2)
        self.tibia = Extremity('tibia leg %d' % legId, tibiaId,legId<2)

    def stand(self,step):
        if step==0:
           self.coxa.setAngle(90)
           self.femur.setAngle(45) # slightly up
           self.tibia.setAngle(120) # slightly up
        elif step==1:
           self.femur.setAngle(60) # slightly up
           self.tibia.setAngle(90) # slightly up

    def sit(self):
        self.coxa.setAngle(90)   # 45° 
        self.femur.setAngle(90)  # flat
        self.tibia.setAngle(150)  # flat

class Spider:
    """ I am a quadruped spider with four legs consisting of coxa, femur and tibia each"""
    def __init__(self):
        self.fl = Leg(0, 0,  1,  2)
        self.fr = Leg(1, 3,  4,  5)
        self.rl = Leg(2, 6,  7,  8)
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

spider = Spider()
actions = ['stand', 'sit', 'forward', 'back',
           'right', 'left', 'hand shake', 'hand wave']

@app.route("/")
def index():
    return render_template("index.html", actions=actions, message='Ready.')


@app.route("/example/<example>")
def showExample(example):
    jsonFileName = 'examples/'+example + '.json'
    print ("trying to read example description from "+jsonFileName)
    if os.path.isfile(jsonFileName):
        # https://stackoverflow.com/a/30388020/1497139
        with open(jsonFileName, 'r', encoding='utf-8') as jsonFile:
            exampleJson=json.load(jsonFile)
            print(json.dumps(exampleJson,indent=2, sort_keys=True))
            # path json content as template params
            # https://stackoverflow.com/a/35470902/1497139
            return render_template("trial.html", **exampleJson)
    else:
      abort(404)

def index(msg):
    return render_template('index.html', actions=actions, message=msg)

@app.route("/servo/<int:servoId>/<int:angle>", methods=['GET'])
def setservo(servoId,angle):
    servo = Servo.servos[servoId]
    trueAngle=servo.setAngle(angle)
    msg="setting servo %d:%s to angle %d° trueAngle %d°" % (servoId,servo.name,angle,trueAngle)
    print (msg)
    json="{ id: %d, angle: %d, trueAngle: %d}" % (servoId,angle,trueAngle)
    return json

@app.route("/action", methods=['POST'])
def action():
    action = request.form.get('action')
    msg=action + '\n' + yaml.dump(spider)
    print(msg)
    if action == 'stand':
        spider.stand()
    elif action == 'sit':
        spider.sit()
    return index(msg)

if __name__ == '__main__':
    app.run(port='5002', host='0.0.0.0')
