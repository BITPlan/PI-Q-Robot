// a part has a namem, position x,y,z and rotation vector coordinates rx,ry,rz
class BasePart {
  // construct me from the given parameters
  constructor(name, x, y, z, rx, ry, rz, debug = false) {
    this.name = name;
    this.x = x;
    this.y = y;
    this.z = z;
    this.rx = rx;
    this.ry = ry;
    this.rz = rz;
    this.debug = debug;
    this.mesh = null;
    this.error = null;
    this.quaternion = new THREE.Quaternion();
    this.rotation = new THREE.Euler();
    this.rotationDeg = new THREE.Euler();
  }

  // https://stackoverflow.com/questions/55192521/what-to-do-now-three-getworldrotation-has-gone
  getWorldRotation() {
    this.mesh.getWorldQuaternion(this.quaternion);
    this.rotation.setFromQuaternion(this.quaternion);
    return this.rotation;
  }

  getWorldRotationDeg() {
    var rotation = this.getWorldRotation();
    var f = 180 / Math.PI;
    this.rotationDeg.x = this.rotation.x * f;
    this.rotationDeg.y = this.rotation.y * f;
    this.rotationDeg.z = this.rotation.z * f;
    return this.rotationDeg;
  }

  // initialize the mesh for this part
  initializeMesh(mesh) {
    // add bidirectional references from mesh to part
    this.mesh = mesh;
    // name the mesh so that we can do lookups by name
    mesh.name = this.name;
    // position and rotate mesh as requested
    mesh.position.set(this.x, this.y, this.z);
    mesh.rotation.set(deg2rad(this.rx), deg2rad(this.ry), deg2rad(this.rz));
    // mesh.scale.set(0.5, 0.5, 0.5);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
  }

  // if we have just been loaded or otherwise created
  onCreate(mesh) {
    this.initializeMesh(mesh);
    // does this part have a pivot?
    if (this.pivot) {
      // create the Pivot Object3D
      var pivotMesh = new THREE.Group();
      this.pivot.initializeMesh(pivotMesh);
      pivotMesh.add(this.mesh);
      //ChildPart.adjustRelativeTo(this.mesh, this.pivot.mesh);
      // make sure the Pivot is linked correctly into the hierarchy later!
      //this.robot.debugMesh("pre SceneAdd", mesh);
      //this.robot.debugMesh("pre SceneAdd", pivotMesh);
      MeshFactory.getInstance().scene.add(pivotMesh);
      //this.robot.debugMesh("post SceneAdd", mesh);
      //this.robot.debugMesh("post SceneAdd", pivotMesh);
    } else {
      //this.robot.debugMesh("pre SceneAdd", mesh);
      MeshFactory.getInstance().scene.add(mesh);
      //this.robot.debugMesh("post SceneAdd", mesh);
    }
  }

}

// rotation joint
// see e.g. https://en.wikipedia.org/wiki/Pivot_joint
class Pivot extends BasePart {
  // construct me with the given parameters
  constructor(part, x, y, z, rx, ry, rz, radius, debug = false) {
    super(part.name + "-pivot", x, y, z, rx, ry, rz, debug);
    this.part = part;
    this.radius = radius;
    // fields to be set later
    // defaults will be overridden and are just for illustration/documentation
    // what values to expect
    this.angle = part.ry;
    this.pivotAxisName = 'y';
    this.pivotAxis = new THREE.Vector3(0, 1, 0);
    this.pivotEnabled=true;
  }

  // construct me from the given JSON Object o for the given part p
  static fromJsonObjForPart(part, o) {
    var pivot = new Pivot(part, o.x, o.y, o.z, o.rx, o.ry, o.rz, o.radius);
    return pivot;
  }

  // https://stackoverflow.com/a/48919815/1497139
  static reparentObject3D(subject, newParent) {
    subject.matrix.copy(subject.matrixWorld);
    subject.applyMatrix(new THREE.Matrix4().getInverse(newParent.matrixWorld));
    newParent.add(subject);
  }

  // add GUI options for this Pivot
  addGUI(gui, options) {
    var part = this.part;
    if (options.rotateBy == 'P' || options.rotateBy=='T') {
      if (options.rotateBy == 'T') {
        options[part.name + ".axis"] = this.pivotAxisName;
        gui.add(options, part.name + ".axis").listen();
        this.pivotEnabled=false;
        this.angle=0;
        options[part.name + ".enabled"] = this.pivotEnabled;
        gui.add(options, part.name + ".enabled").listen();
      }
      options[part.name + ".angle"] = this.angle;
      gui.add(options, part.name + ".angle", -180, 180).listen();
    } else {
      options[part.name + ".rx"] = part.pivot.rx;
      options[part.name + ".ry"] = part.pivot.ry;
      options[part.name + ".rz"] = part.pivot.rz;
      // TODO make range configurable
      gui.add(options, part.name + ".rx", -180, 180).listen();
      gui.add(options, part.name + ".ry", -180, 180).listen();
      gui.add(options, part.name + ".rz", -180, 180).listen();
    }
  }

  // callback on render
  onRender(scene, options) {
    var mesh = this.mesh;
    var part = this.part;
    if (mesh) {
      if (options.rotateBy == 'P' || options.rotateBy=='T')  {
        this.angle = options[part.name + ".angle"];
        if (options.rotateBy == 'P') {
           mesh.setRotationFromAxisAngle(this.pivotAxis, deg2rad(this.angle));
        }
        if (options.rotateBy == 'T') {
          this.enabled=options[part.name + ".enabled"];
          if (this.enabled) {
            // then extra rotation as set
            mesh.setRotationFromAxisAngle(this.pivotAxis, deg2rad(this.angle));
          }
        }
      } else {
        var rx = options[part.name + ".rx"];
        var ry = options[part.name + ".ry"];
        var rz = options[part.name + ".rz"];
        if (options.rotateBy == 'A') {
          mesh.setRotationFromAxisAngle(xAxis, deg2rad(rx));
          mesh.setRotationFromAxisAngle(yAxis, deg2rad(ry));
          mesh.setRotationFromAxisAngle(zAxis, deg2rad(rz));
          // the rotateOnAxis is no good for static position it will create a dynamic effect
          //mesh.rotateOnAxis(xAxis,deg2rad(rx));
          //mesh.rotateOnAxis(yAxis,deg2rad(ry));
          //mesh.rotateOnAxis(zAxis,deg2rad(rz));
        } else if (options.rotateBy == 'R') {
          mesh.rotation.set(deg2rad(rx), deg2rad(ry), deg2rad(rz));
        } else if (options.rotateBy == 'Q') {
          // https://codepen.io/luics/pen/GEbOYO
          // could be just one instance for memory performance
          var quaternion = new THREE.Quaternion();
          quaternion.setFromAxisAngle(yAxis, deg2rad(ry));
          mesh.position.applyQuaternion(quaternion);
        }
      }
    }
  }

  // calculate my rotation
  calcRotation() {
    var part = this.part;
    var r = part.getWorldRotationDeg();
    this.angle = part.ry;
    this.pivotAxisName = 'y';
    this.pivotAxis = new THREE.Vector3(0, 1, 0);
    // are we rotated in x direction (90 or 270 degrees)
    if (Part.angleIsNear(r.y, 90, 270, 1)) {
      this.angle = part.rx;
      this.pivotAxisName='x';
      // y-Axis
      this.pivotAxis=new THREE.Vector3(0,1,0);
    } else if (Part.angleIsNear(r.x, 90, 270, 1)) {
      this.pivotAxisName = 'z';
      this.angle = part.rz;
      this.pivotAxis = new THREE.Vector3(0, 0, 1);
    }
    if (part.debug)
      console.log("calc rotation: pivotAxis for " + this.name + " is " + this.pivotAxisName);
  }

  // create a visible pivot Joint
  createPivotJoint() {
    if (this.part.debug)
      this.part.addSizeArrows();
    var radius = this.radius;
    var part = this.part;
    this.calcRotation();
    // height in normal "up" rotation
    var height = part.size.y;
    if (this.pivotAxisName == 'x') {
      height = part.size.x;
    } else if (this.pivotAxisName == 'z') {
      height = part.size.y;
    }
    var meshFactory = MeshFactory.getInstance();
    // cylinder
    var pivotJoint = meshFactory.createCylinder(
      radius,
      height,
      true
    );
    // TODO use sphere when pivot can be rotated around all axes
    // pivot=MeshFactory.getInstance().createSphere(pivotr,true);
    pivotJoint.material.color.set(meshFactory.pivotColor);
    return pivotJoint;
  }

  // create a joint for this pivot and the given part
  createJoint() {
    var pivotJoint = this.createPivotJoint();
    pivotJoint.name = this.name + ".Joint";
    // for debugging
    if (this.part.debug) {
      objects.push(pivotJoint);
      this.mesh.add(pivotJoint);
    }
  }
}

// a child part is a basepart with an optional stl file to load from
class ChildPart extends BasePart {

  // construct me with the given name from the given stl url
  // with the given position x,y,z and
  // rotation rx,ry,rz
  constructor(name, stl, x, y, z, rx, ry, rz, debug = false) {
    super(name, x, y, z, rx, ry, rz, debug);
    this.stl = stl;
    // create attributes to be used later
    this.partCount = 1;
    this.pivot = null;
    this.robot = null;
    this.parent = null;
    this.showProgress = false;
    this.allParts = null;
  }

  pivotMesh() {
    if (this.pivot)
      return this.pivot.mesh;
    else
      return this.mesh;
  }

  // calculate the size of this part by creating a bounding box around it
  calcSize() {
    if (this.debug) {
      console.log("calculating size for " + this.name);
    }
    var bbox = new THREE.Box3();
    if (this.mesh.geometry)
      bbox = this.mesh.geometry.boundingBox;
    else {
      var bboxwire = this.getBoundingBoxWire();
      ChildPart.adjustRelativeTo(bboxwire, this.mesh);
      bbox.setFromObject(bboxwire);
    }
    this.bbox = bbox;
    this.size = new THREE.Vector3(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y,
      bbox.max.z - bbox.min.z
    );
    var length = this.size.length();
    if (length == 0) {
      console.log("error: length of bounding box vector of " + this.name + " is zero");
    }
    // remember my size
    this.mesh.userData['size'] = this.size;
    if (this.debug) {
      console.log(
        "size for " +
        this.name +
        "=" + Debug.asString("six", "siy", "siz", this.size) + " length: " + length
      );
    }
  }

  /**
   * add an STL file from the given url and set it's name to be able to retrieve it later
   */
  addSTL(whenDone) {
    var part = this;
    if (part.stl) {
      MeshFactory.getInstance().loader.load(part.stl, onLoad, onProgress, onError);
    } else {
      // this mesh is also potentially a pivot point to rotate around
      var mesh = new THREE.Group();
      var msg = "creating parent with no STL"
      onCreate(mesh, msg);
    }

    // callback when an error happens on loading
    function onError(e) {
      console.log("JSONLoader for " + part.name + "(" + part.stl + ") failed! because of error " + e);
      if (typeof e.target !== "undefined") {
        console.log("\tstatus:" + e.target.status + ", text:'" + e.target.statusText + "'");
      }
      if (typeof e.fileName !== "undefined") {
        console.log("\tfileName:" + e.fileName);
      }
      if (typeof e.lineNumber !== "undefined") {
        console.log("\tline:" + e.lineNumber);
      }
      if (typeof e.columnNumber !== "undefined") {
        console.log("\tcol:" + e.columnNumber);
      }
      // flag the error for the part
      part.error = e;
    }

    // callback for on progress
    function onProgress(xhr) {
      if (part.showProgress) {
        // https://stackoverflow.com/a/38782996/1497139
        if (xhr.lengthComputable) {
          var percentComplete = xhr.loaded / xhr.total * 100;
          var percentDone = Math.round(percentComplete, 2);
          console.log("JSONLoader for " + part.name + " " + percentDone + " % done");
        }
      }
    }

    function onLoad(geometry) {
      var material = MeshFactory.getInstance().material.clone();
      var mesh = new THREE.Mesh(geometry, material);
      geometry.center();
      onCreate(mesh, "loading from url " + part.stl);
    }

    // callback on creation of loaded mesh
    function onCreate(mesh, msg) {
      part.onCreate(mesh);
      if (whenDone) {
        console.log(part.name + ": " + msg + " finished")
        whenDone(part)
      }
    };
  }

  static adjustRelativeTo(mesh, toMesh) {
    //logSelected("adjusting toMesh",toMesh);
    //logSelected("beforeAdjust",this.mesh);
    toMesh.updateMatrixWorld(); // important !
    mesh.applyMatrix(new THREE.Matrix4().getInverse(toMesh.matrixWorld));
    //logSelected("afterAdjust",this.mesh);
  }

  //  adjust me relative to the given (pivot) mesh
  adjustRelative(toMesh) {
    ChildPart.adjustRelativeTo(this.mesh, toMesh);
  }

  getBoundingBoxWire() {
    var boxwire = new THREE.BoxHelper(this.mesh, 0xff8000);
    return boxwire;
  }

  // add my bounding box wire to the given mesh
  addBoundingBoxWire(toMesh) {
    if (this.robot.boxwires) {
      var boxwire = this.getBoundingBoxWire();
      ChildPart.adjustRelativeTo(boxwire, toMesh);
      boxwire.name = this.name + "-boxWire";
      toMesh.add(boxwire);
    }
  }

  // add an AxesHelper with my size to the given mesh
  addAxesHelper(toMesh) {
    var axis = new THREE.AxesHelper(this.size.length());
    toMesh.add(axis);
  }

  // add may bounding box wire and AxesHelper to the given mesh
  addBoxWireAndAxesHelper(toMesh) {
    this.addBoundingBoxWire(toMesh);
    this.addAxesHelper(toMesh);
  }

  // call pack when loading is finished for a given part
  static onLoaded(part) {
    part.loaded()
  }

  loaded() {
    if (!this.mesh) {
      console.log("error: loaded called but mesh not set for " + this.name)
      return;
    }
    // make clickable and potentially draggable
    objects.push(this.mesh);
    this.robot.partLoaded(this);
  }

  getParentPart() {
    var parentMesh = MeshFactory.getInstance().scene.getObjectByName(this.parent);
    if (!parentMesh) {
      console.log('error: parentMesh ' + this.parent + ' not available yet for ' + this.name);
      return;
    }
    var parentPart = this.robot.getPartByName(parentMesh.name);
    return parentPart;
  }

  // abstract hierarchy integration for ChildPart
  integrate() {
    // if i am a child part integrate me via my parent part
    if (this.parent) {
      var parentPart = this.getParentPart();
      // tell my parent that i'd like to be integrated
      parentPart.integrateChild(this);
    } else {
      // integrate me directly with robot
      this.robot.integratePart(this);
    }
  }

  // called when all parts have been loaded
  fullyLoaded() {
    // integrate this part into the hierachy
    this.integrate();
    // then calculate my size
    this.calcSize();
    if (this.robot.boxwires) {
      this.addBoundingBoxWire(this.mesh);
    }
  }

  // load me
  load() {
    // use the STL loader and the onLoaded callback
    this.addSTL(ChildPart.onLoaded);
  }

}

// a part that can have subparts
class Part extends ChildPart {
  // construct me with the given name, stl url, position x,y,z and rotation rx,ry,rz
  constructor(name, stl, x, y, z, rx, ry, rz) {
    super(name, stl, x, y, z, rx, ry, rz);
    // attributes to be configured later
    this.parts = [];
    this.partsIntegrated = 0;
  }

  // construct a part from the given Json Object allowing a hierachy of parts to be created
  static fromJsonObj(partJsonObj) {
    var part = new Part(partJsonObj.name, partJsonObj.stl, partJsonObj.x, partJsonObj.y, partJsonObj.z, partJsonObj.rx, partJsonObj.ry, partJsonObj.rz);
    if (typeof partJsonObj.pivot !== "undefined" && partJsonObj.pivot) {
      part.pivot = Pivot.fromJsonObjForPart(part, partJsonObj.pivot);
    }
    // are there any subparts?
    if (typeof partJsonObj.parts !== "undefined") {
      for (var partsIndex in partJsonObj.parts) {
        var subPartJsonObj = partJsonObj.parts[partsIndex];
        var subPart = Part.fromJsonObj(subPartJsonObj);
        part.partCount += subPart.partCount;
        subPart.parent = part.name;
        part.parts.push(subPart);
      }
    }
    return part;
  }

  // remove an array element by the given key
  // see https://stackoverflow.com/a/10024943/1497139
  static removeArrayElementByName(someArray, key) {
    for (var i = 0; i < someArray.length; i++)
      if (someArray[i].name === key) {
        someArray.splice(i, 1);
        break;
      }
  }

  // reparent a part
  reparent(newParentName) {
    var newParentPart = this.robot.getPartByName(newParentName);
    var parentName = this.robot.name;
    var parentPartArray = this.robot.parts;
    if (this.parent) {
      var parentPart = this.getParentPart();
      parentName = this.parent;
      parentPartArray = parentPart.parts;
    }
    console.log("reparenting " + this.name + " from " + parentName + " to " + newParentName);
    Part.removeArrayElementByName(parentPartArray, this.name);
    newParentPart.parts.push(this);
  }

  // integrate the given childPart after it has been loaded
  integrateChild(childPart) {
    console.log("adding " + childPart.name + " to " + this.name);
    // https://stackoverflow.com/a/26413121/1497139
    //this.mesh.attach(childPart.mesh);
    var parentMesh = this.pivotMesh();
    var childMesh = childPart.pivotMesh();
    parentMesh.add(childMesh);
    if (this.robot.positioning !== 'relative')
      ChildPart.adjustRelativeTo(childMesh, parentMesh);

    this.partsIntegrated++;
    if (this.partsIntegrated == this.partCount) {
      console.log("all " + this.partsIntegrated + " child parts of " + this.name + " integrated")
      this.robot.integratePart(this);
    }
  }

  load() {
    // load the direct stl
    super.load();
    // recursively load other parts
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      part.load();
    }
  }

  // add an Arrow with the given direction dir length len and color
  addArrow(dir, len, color) {
    // see e.g. https://codepen.io/arpo/pen/LkXYGQ/?editors=0010
    var arrow = new THREE.ArrowHelper(dir, this.pivot.mesh.position, len, color);
    ChildPart.adjustRelativeTo(arrow, this.pivot.mesh);
    this.mesh.add(arrow);
  }

  // add size Arrows according to the Axis
  addSizeArrows() {
    // FIXME - shall we rely on the global defined Axis vectors?
    var xa = new THREE.Vector3(1, 0, 0);
    var ya = new THREE.Vector3(0, 1, 0);
    var za = new THREE.Vector3(0, 0, 1);
    // https://stackoverflow.com/a/48729691/1497139
    this.addArrow(xa, this.size.x / 2, 'red');
    this.addArrow(ya, this.size.y / 2, 'green');
    this.addArrow(za, this.size.z / 2, 'blue');
  }

  static valueIsNear(value, check1, check2, maxDiff) {
    return (((value > check1 - maxDiff) && (value < check1 + maxDiff)) || ((value > check2 - maxDiff) && (value < check2 + maxDiff)))
  }

  static angleIsNear(angle, check1, check2, maxDiff) {
    var value = angle;
    value = value % 360;
    if (value < 0)
      value = value + 360;
    return Part.valueIsNear(value, check1, check2, maxDiff);
  }

  // recursively get all parts
  getAllParts() {
    this.allParts = this.parts.slice(0); // clone the parts
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      if (typeof part.getAllParts !== "undefined") {
        part.getAllParts();
        for (var subPartsIndex in part.allParts) {
          this.allParts.push(part.allParts[subPartsIndex]);
        }
      }
    }
  }

  // called when me and all my subparts have been loaded
  fullyLoaded() {
    // bottom up -first the parts
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      part.fullyLoaded();
    }
    // then myself
    super.fullyLoaded();
    if (this.pivot !== null) {
      this.pivot.createJoint();
      // show axes and bounding box wire frame for debugging
      if (this.debug) {
        console.log("adding axes helper to joint/pivot for" + this.name)
        this.addAxesHelper(this.mesh);
      }
    }
  }
}

// a robot consists of a name and a list of parts
class Robot {
  // construct me with the given name, url to my source (copyright), camera positioning, positioning mode and array of parts
  constructor(name, url, camera, positioning = 'absolute', parts, debug = false, boxwires = true) {
    this.name = name;
    this.url = url;
    this.camera = camera;
    this.positioning = positioning;
    this.parts = parts;
    this.boxwires = boxwires;
    // set to true to debug
    this.debug = debug;
    this.sceneDebug = new SceneDebug(MeshFactory.getInstance().scene);
    // fields to be used later
    this.whenIntegrated = null;
    this.partsIntegrated = 0;
    this.partsLoaded = 0;
    // how often has this robot been rendered?
    this.renderCounter = 0;
    this.partCount = 0;
    // disable robot until fully Loaded
    this.enabled = false;
    // make sure my parts know me
    for (var partIndex in parts) {
      var part = parts[partIndex];
      console.log(part.name + ": " + part.partCount + " parts");
      this.partCount += part.partCount;
    }
    this.getAllParts();
    for (var partIndex in this.allParts) {
      this.allParts[partIndex].robot = this;
    }
  }

  // save me in json format
  save() {
    var fields = ["", "name", "camera", "url", "positioning", "pivot", "x", "y", "z", "rx", "ry", "rz", "radius", "stl", "parts"];

    function replacer(key, value) {
      if (value === null) {
        //console.log('ignoring undefined '+key+'('+typeof (key)+')');
        return undefined;
      }
      if (fields.includes(key))
        return value;
      // allow normal arrays (parts) to be stringified
      if (key.match('[0-9]+'))
        return value;
      //console.log('ignoring '+key+'('+typeof (key)+')');
    };
    var json = (JSON.stringify(this, replacer, 2));
    SceneExporter.saveJSON(json, this.name + ".json");
  }

  // rearrange
  rearrange() {
    console.log("rearranging ...");
    for (var partIndex in this.allParts) {
      var part = this.allParts[partIndex];
    }
    this.save();
  }

  debugMesh(prefix, mesh) {
    if (this.debug) {
      this.sceneDebug.showObject(prefix, mesh);
    }
  }

  // construct a Robot from the given JSON Object
  static fromJsonObj(robotObj, debug = false) {
    // first create the array of parts
    var parts = [];
    for (var partIndex in robotObj.parts) {
      var partJsonObj = robotObj.parts[partIndex];
      var part = Part.fromJsonObj(partJsonObj);
      part.debug = debug;
      parts.push(part);
    }
    // now call the constructor (which will add back pointers to the robot for each part)
    var robot = new Robot(robotObj.name, robotObj.url, robotObj.camera, robotObj.positioning, parts);
    return robot;
  }

  // construct a Robot from the given json String
  static fromJson(robotJson) {
    // parse the JSON string
    var robotObj = JSON.parse(robotJson);
    // construct Robot from the Json Object
    return fromJsonobj(robotObj);
  }

  // load all my parts with the given scene and call the given whenIntegrated callback when done
  loadParts(whenIntegrated) {
    MeshFactory.getInstance().scene.name = this.name;
    // remember the callback for finalizing the integration - see integratePart
    this.whenIntegrated = whenIntegrated;
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      // integratePart will be called when finished
      part.load();
    }
  }

  // call back for parts being loaded
  partLoaded(part) {
    this.partsLoaded++;
    if (this.partsLoaded == this.partCount) {
      console.log("all " + this.partCount + " parts of " + this.name + " loaded")
      this.fullyLoaded();
    }
  }

  // finalize the loading of the given part - will call whenIntegrated when all parts have been integrated
  integratePart(part) {
    this.partsIntegrated += part.partCount;
    console.log("integrating " + part.name + ": " + part.partCount + " parts =>" + this.partsIntegrated + "/" + this.partCount);
  }

  // callback when robot is fully loaded
  fullyLoaded() {
    // do we need to update the scene before integrating?
    // for the time being we assume it's not necessary
    // MeshFactory.getInstance().scene.updateMatrixWorld();
    for (var partIndex in this.parts) {
      this.parts[partIndex].fullyLoaded();
    }
    // call the whenIntegrated callback
    if (this.whenIntegrated) {
      this.whenIntegrated();
    }
    // now we can enable the robot
    this.enabled = true;
  }

  // lookup a part by it's name
  getPartByName(name) {
    return this.allPartsByName[name];
  }

  // get AllParts recursively
  getAllParts() {
    this.allParts = this.parts.slice(0); // clone the parts
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      part.getAllParts();
      for (var subPartsIndex in part.allParts) {
        this.allParts.push(part.allParts[subPartsIndex]);
      }
    }
    this.allPartsByName = [];
    for (var partsIndex in this.allParts) {
      var part = this.allParts[partsIndex];
      this.allPartsByName[part.name] = part;
    }
  }

  // recursively set debug flag
  setDebug(pDebug = true) {
    this.debug = pDebug;
    for (var partIndex in this.allParts) {
      this.allParts[partIndex].debug = pDebug;
    }
  }

  // add my options to dat.gui for interative rendering
  addGUI(gui, options) {
    console.log("preparing gui rendering options for " + this.name)
    for (var partsIndex in this.allParts) {
      var part = this.allParts[partsIndex];
      // does the part have a pivot axes / joint / hinge?
      if (part.pivot !== null) {
        part.pivot.addGUI(gui, options);
      }
    }
  }

  // callBack when scene is rendered
  onRender(scene, options) {
    if (!this.enabled)
      return;
    // Rotate joints
    for (var partsIndex in this.allParts) {
      var part = this.allParts[partsIndex];
      if (part.pivot !== null) {
        part.pivot.onRender(scene, options);
      }
      this.renderCounter++;
    } // for
  } // onRender
} // Robot
