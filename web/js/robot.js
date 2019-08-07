// a part has a name and an stl url and position and rotation vector coordinates
class ChildPart {
  constructor(name, stl, x, y, z, rx, ry, rz) {
    this.name = name;
    this.stl = stl;
    this.x = x;
    this.y = y;
    this.z = z;
    this.rx = rx;
    this.ry = ry;
    this.rz = rz;
    this.joint = null;
    // create attributes to initialized later
    this.robot = null;
    this.parent = null;
    this.mesh = null;
  }

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

    function onError(e) {
      console.log("JSONLoader for " + part.name + " failed! because of error " + e);
      if (typeof e.target !== "undefined") {
        console.log("\t" + e.target.status + ", " + e.target.statusText);
      }
    }

    function onProgress() {

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

    function onCreate(mesh, msg) {
      // add bidirectional references from mesh to part
      part.mesh = mesh;
      mesh.userData['part'] = part;
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

  load(scene, loader) {
    this.addSTL(scene, loader, this.name, this.stl, this.x, this.y, this.z, this.rx, this.ry, this.rz, this.setPositions);
  }
}

class Part extends ChildPart {
  constructor(name, stl, x, y, z, rx, ry, rz) {
    super(name, stl, x, y, z, rx, ry, rz);
    // attributes to be configured later
    this.parts = [];
    this.partsIntegrated = 0;
  }
  // allow a hierarchy of parts to be loaded
  static fromJsonObj(partJsonObj) {
    var part = new Part(partJsonObj.name, partJsonObj.stl, partJsonObj.x, partJsonObj.y, partJsonObj.z, partJsonObj.rx, partJsonObj.ry, partJsonObj.rz);
    if (typeof partJsonObj.joint !== "undefined") {
      part.joint = partJsonObj.joint;
    }
    if (typeof partJsonObj.parts !== "undefined") {
      for (var partsIndex in partJsonObj.parts) {
        var subPartJsonObj = partJsonObj.parts[partsIndex];
        var subPart = Part.fromJsonObj(subPartJsonObj);
        subPart.parent = part.name;
        part.parts.push(subPart);
      }
    }
    return part;
  }

  integrateChild(childPart) {
    console.log("adding " + childPart.name + " to " + this.name);
    this.mesh.add(childPart.mesh);
    this.mesh.updateMatrixWorld(); // important !
    childPart.mesh.applyMatrix(new THREE.Matrix4().getInverse(this.mesh.matrixWorld))
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
  constructor(name, url, parts) {
    this.name = name;
    this.url = url;
    this.parts = parts;
    this.whenIntegrated = null;
    this.partsIntegrated = 0;
    // make sure my parts know me
    for (var partIndex in parts) {
      parts[partIndex].robot = this;
    }
  }

  static fromJsonObj(robotObj) {
    var parts = [];
    for (var partIndex in robotObj.parts) {
      var partJsonObj = robotObj.parts[partIndex];
      parts.push(Part.fromJsonObj(partJsonObj));
    }
    var robot = new Robot(robotObj.name, robotObj.url, parts);
    return robot;
  }

  static fromJson(robotJson) {
    var robotObj = JSON.parse(robotJson);
    return fromJsonobj(robotObj);
  }

  loadParts(scene, whenIntegrated) {
    // remember the callback for finalizing the integration
    this.whenIntegrated = whenIntegrated;
    var loader = new THREE.STLLoader();
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      part.load(scene, loader);
    }
  }

  integratePart(part) {
    this.partsIntegrated++;
    if (this.partsIntegrated == this.parts.length) {
      console.log("all " + this.partsIntegrated + " parts of " + this.name + " integrated")
      if (this.whenIntegrated)
        this.whenIntegrated();
    }
  }

  // add my options to dat.gui for interative rendering
  addGUI(gui, options) {
    console.log("preparing gui rendering options for " + this.name)
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      if (part.joint!==null) {
        options[part.name] = part.joint;
        // TODO make range configurable
        gui.add(options, part.name, -180, 180).listen();
      }
    }
  }

  // rotate the Joints of this robot
  rotateJoints(scene) {
    // Rotate joints
    for (var partsIndex in this.parts) {
      var part = this.parts[partsIndex];
      if (part.joint!==null) {
        var mesh = scene.getObjectByName(part.name);
        if (mesh) {
          var angle = options[part.name];
          mesh.setRotationFromAxisAngle(yAxis, deg2rad(angle));
        }
      }
    }
  }
} // Robot
