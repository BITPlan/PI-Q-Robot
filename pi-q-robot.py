# Spider
# WF 2019-07-09
# WF 2019-07-26
from flask import Flask, request, render_template, send_from_directory, abort
from flask_restful import Resource, Api
import json
import sys
import time
import yaml
import platform
import os.path
print("Running on %s" % (platform.system()))

# prepare the adafruit servo access
if platform.system() == 'Linux':
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
    def __init__(self, id):
        self.id = id

    def setAngle(self, angle):
        self.angle = angle
        if kit is not None:
            kit.servo[self.id].angle = angle

class Extremity:
    def __init__(self, name, id):
        self.name = name
        self.servo = Servo(id)

    def setAngle(self, angle):
        self.servo.setAngle(angle)

class Leg:
    def __init__(self, coxaId, tibiaId, femurId):
        self.coxa = Extremity('coxa', coxaId)
        self.tibia = Extremity('tibia', tibiaId)
        self.femur = Extremity('femur', femurId)

    def stand(self):
        self.coxa.setAngle(105)
        self.tibia.setAngle(105)
        self.femur.setAngle(105)

    def sit(self):
        self.coxa.setAngle(180)
        self.tibia.setAngle(180)
        self.femur.setAngle(180)

class Spider:
    def __init__(self):
        self.fl = Leg(0, 1, 2)
        self.fr = Leg(3, 4, 5)
        self.rl = Leg(6, 7, 8)
        self.rr = Leg(9, 10, 11)

    def stand(self):
        self.fl.stand()
        self.fr.stand()
        self.rl.stand()
        self.rr.stand()

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
    msg="setting servo %d to angle %d" % (servoId,angle)
    print (msg)
    servo = Servo(servoId)
    servo.setAngle(angle)
    json="{ angle: %d, id: %d}" % (angle,servoId)
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
