// a part has a name and an stl url and position and rotation vector coordinates
class ChildPart {

  // construct me with the given name from the given stl url
  // with the given position x,y,z and
  // rotation rx,ry,rz
  constructor(name, stl, x, y, z, rx, ry, rz,debug=false) {
    this.name = name;
    this.stl = stl;
    this.x = x;
    this.y = y;
    this.z = z;
    this.rx = rx;
    this.ry = ry;
    this.rz = rz;
    this.debug = debug;
    this.partCount=1;
    // create attributes to be used later
    this.joint = null;
    this.robot = null;
    this.parent = null;
    this.mesh = null;
    this.error = null;
    this.showProgress = false;
  }

  // calculate the size of this part by creating a bounding box around it
  calcSize() {
    var bbox = new THREE.Box3().setFromObject(this.mesh);
    this.bbox = bbox;
    this.size = new THREE.Vector3(
      bbox.max.x - bbox.min.x,
      bbox.max.y - bbox.min.y,
      bbox.max.z - bbox.max.z
    );
    if (this.debug)
      console.log(
        "bounding box for " +
          this.name +
          "=" +
          JSON.stringify(bbox.min) +
          JSON.stringify(bbox.max)
      );
  }

  // set the positions with the given scene name and
  // position x,y,z
  setPositions(scene, name, x, y, z) {
    var mesh = scene.getObjectByName(name);
    if (mesh) {
      mesh.position.set(x, y, z)
      // make clickable and potentially draggable
      objects.push(mesh);
      // callback for part
      var part = mesh.userData['part'];
      // integrate the part into the hierachy
      part.integrate(scene);
    }
  }

  // abstract hierarchy integration for ChildPart
  integrate(scene) {
    // if i am a child part integrate me via my parent part
    if (this.parent) {
      var parentMesh = scene.getObjectByName(this.parent);
      var parentPart = parentMesh.userData['part'];
      // tell my parent that i'd like to be integrated
      parentPart.integrateChild(this);
    } else {
      // integrate me directly with robot
      this.robot.integratePart(this);
    }
  }

  /**
   * add an STL file from the given url and set it's name to be able to retrieve it later
   */
  addSTL(scene, loader, name, url, x, y, z, rx, ry, rz, whenDone) {
    var part = this; // make this available for callbacks
    if (url) {
      loader.load(url, onLoad, onProgress, onError);
    } else {
      var mesh = new THREE.Group();
      var msg = "creating parent with no STL"
      onCreate(mesh, msg);
    }

    // callback when an error happens on loading
    function onError(e) {
      console.log("JSONLoader for " + part.name + "(" + part.stl + ") failed! because of error " + e);
      if (typeof e.target !== "undefined") {
        console.log("\tstatus:" + e.target.status + ", text:'" + e.target.statusText+"'");
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
      // Model:
      var material = new THREE.MeshPhongMaterial({
        color: 0xFFFFFF, // light gray
        specular: 0x111111, // very dark grey
        shininess: 50
      });
      var mesh = new THREE.Mesh(geometry, material);
      mesh.up.set(0, 1, 0);
      // mesh.position.set(x, y, z);
      geometry.center();
      onCreate(mesh, "loading from url " + url);
    }

    // callback on creation of loaded mesh
    function onCreate(mesh, msg) {
      // add bidirectional references from mesh to part
      part.mesh = mesh;
      // make the part available in the userdata of the mesh
      mesh.userData['part'] = part;
      // rotate mesh as requested
      mesh.rotation.set(deg2rad(rx), deg2rad(ry), deg2rad(rz));
      // mesh.scale.set(0.5, 0.5, 0.5);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.name = name;
      scene.add(mesh);
      if (whenDone) {
        console.log(name + ": " + msg + " finished")
        whenDone(scene, name, x, y, z)
      }
    };
  }

  shiftRelative(toMesh) {

      logSelected("shifting toMesh",toMesh);
      logSelected("beforeShift",this.mesh);
    toMesh.updateMatrixWorld(); // important !
    this.mesh.applyMatrix(new THREE.Matrix4().getInverse(toMesh.matrixWorld));
      logSelected("afterShift",this.mesh);
  }

  // load me using the given scene and loader
  load(scene, loader) {
    // call a function with parameters to avoid javascripts this.<field> mess
    this.addSTL(scene, loader, this.name, this.stl, this.x, this.y, this.z, this.rx, this.ry, this.rz, this.setPositions);
  }

  // called when all parts have been loaded
  fullyLoaded() {
    this.calcSize();
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
    if (typeof partJsonObj.joint !== "undefined") {
      part.joint = partJsonObj.joint;
    }
    // are there any subparts?
    if (typeof partJsonObj.parts !== "undefined") {
      for (var partsIndex in partJsonObj.parts) {
        var subPartJsonObj = partJsonObj.parts[partsIndex];
        var subPart = Part.fromJsonObj(subPartJsonObj);
        this.partCount+=subPart.partCount;
        subPart.parent = part.name;
        part.parts.push(subPart);
      }
    }
    return part;
  }

  // integrate the given childPart after it has been loaded
  integrateChild(childPart) {
    console.log("adding " + childPart.name + " to " + this.name);
    // https://stackoverflow.com/a/26413121/1497139
    // this.mesh.attach(childPart.mesh);
    this.mesh.add(childPart.mesh);

    childPart.shiftRelative(this.mesh);

    this.partsIntegrated++;
    if (this.partsIntegrated == this.parts.length) {
      console.log("all " + this.partsIntegrated + " child parts of " + this.name + " integrated")
      this.robot.integratePart(this);
    }
  }

  load(scene, loader) {
    // load the direct stl
    super.load(scene, loader);
    // recursively load other parts
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      part.load(scene, loader);
    }
  }
}

// a robot consists of a name and a list of parts
class Robot {
  // construct me with the given name, url to my source (copyright) and array of parts
  constructor(name, url, parts,debug=false) {
    this.name = name;
    this.url = url;
    this.parts = parts;
    // set to true to debug
    this.debug = debug;
    // fields to be used later
    this.whenIntegrated = null;
    this.partsIntegrated = 0;
    this.rotateCounter = 0;
    this.partCount=0;
    // make sure my parts know me
    for (var partIndex in parts) {
      var part=parts[partIndex];
      this.partCount+=part.partCount+1;
      part.robot = this;
    }
  }

  debug(pDebug=true) {
    this.debug=pDebug;
    for (var partIndex in parts) {
      parts[partIndex].debug = pDebug;
    }
  }

  // construct a Robot from the given JSON Object
  static fromJsonObj(robotObj,debug=false) {
    // first create the array of parts
    var parts = [];
    for (var partIndex in robotObj.parts) {
      var partJsonObj = robotObj.parts[partIndex];
      var part=Part.fromJsonObj(partJsonObj);
      part.debug=debug;
      parts.push(part);
    }
    // now call the constructor (which will add back pointers to the robot for each part)
    var robot = new Robot(robotObj.name, robotObj.url, parts);
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
  loadParts(scene, whenIntegrated) {
    // remember the callback for finalizing the integration - see integratePart
    this.whenIntegrated = whenIntegrated;
    var loader = new THREE.STLLoader();
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      // integratePart will be called when finished
      part.load(scene, loader);
    }
  }

  // finalize the loading of the given part - will call whenIntegrated when all parts have been integrated
  integratePart(part) {
    this.partsIntegrated++;
    if (this.partsIntegrated == this.partCount) {
      console.log("all " + this.partsIntegrated + " parts of " + this.name + " integrated")
      this.fullyLoaded();
    }
  }

  fullyLoaded() {
    for (var partIndex in this.parts) {
      this.parts[partIndex].fullyLoaded();
    }
    // call the whenIntegrated callback
    if (this.whenIntegrated) {
      this.whenIntegrated();
    }
  }

  // add my options to dat.gui for interative rendering
  addGUI(gui, options) {
    console.log("preparing gui rendering options for " + this.name)
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      if (part.joint !== null) {
        options[part.name] = part.joint;
        // TODO make range configurable
        gui.add(options, part.name, -180, 180).listen();
      }
    }
  }

  // rotate the Joints of this robot
  rotateJoints(scene, options) {
    // Rotate joints
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      if (part.joint !== null) {
        var mesh = scene.getObjectByName(part.name);
        if (mesh) {
          var angle = options[part.name];
          // be careful when uncommenting this for debugging - this is triggered on every render request
          // at the fps your computer is capable of
          this.rotateCounter++;
          /*
          if (this.debug)
            if (this.rotateCounter % 50 == 0)
              logSelected("preRotate", mesh);
          */
          if (options.byAxis) {
            if (options.rotateX)
              mesh.setRotationFromAxisAngle(xAxis, deg2rad(angle));
            if (options.rotateY)
              mesh.setRotationFromAxisAngle(yAxis, deg2rad(angle));
            if (options.rotateZ)
              mesh.setRotationFromAxisAngle(zAxis, deg2rad(angle));
          } else {
            if (options.rotateX)
              mesh.rotation.x = deg2rad(angle);
            if (options.rotateY)
              mesh.rotation.y = deg2rad(angle);
            if (options.rotateZ)
              mesh.rotation.z = deg2rad(angle);
          }
          /*
          if (this.debug)
            if (this.rotateCounter % 50 == 0)
              logSelected("postRotate", mesh);
          */
        }
      }
    }
  }
} // Robot
