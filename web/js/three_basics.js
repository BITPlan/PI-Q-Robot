// Factory for Meshes with common properties e.g. same material / segments
class MeshFactory {
  static getInstance() {
    return MeshFactory.instance;
  }

  // create me with the given scene, loader, default material and default segments
  constructor(scene, loader, material, segments) {
    this.scene = scene;
    this.loader = loader;
    this.material = material;
    this.segments = segments;
    this.selectionColor = 'blue';
    this.pivotColor = 'red';
    MeshFactory.instance = this;
  }

  // creates a cylinder with given radius and height
  createCylinder(radius, height, cloneMaterial = false) {
    var cylinderGeometry = new THREE.CylinderGeometry(
      radius,
      radius,
      height,
      this.segments,
      this.segments
    );
    return this.createMesh(cylinderGeometry, cloneMaterial);
  }

  // creates a cube with the given width, height and depth
  createCube(width,height,depth, cloneMaterial=false) {
    var boxGeometry=new THREE.BoxGeometry(width,height,depth);
    return this.createMesh(boxGeometry,cloneMaterial);
  }

  // creates a sphere with given radius and height
  createSphere(radius, cloneMaterial = false) {
    var sphereGeometry = new THREE.SphereGeometry(
      radius,
      this.segments,
      this.segments
    );
    return this.createMesh(sphereGeometry, cloneMaterial);
  }

  // creates a mesh with the given geometry, optionally cloning Material
  createMesh(geometry, cloneMaterial = false) {
    var mesh = new THREE.Mesh(geometry, this.getMaterial(cloneMaterial));
    return mesh;
  }

  // get the material of this factory - when cloned is true clone a copy of the material
  // for further modification e.g. changing of color
  getMaterial(cloned) {
    var material = this.material;
    if (cloned) material = material.clone();
    return material;
  }
}
class Debug {
  static asString(x, y, z, v, f = 1) {
    return "(" +
      Debug.format2(x, (v.x * f)) + " " +
      Debug.format2(y, (v.y * f)) + " " +
      Debug.format2(z, (v.z * f)) + ")";
  }

  static format2(prefix, n) {
    return Debug.leftJustify(prefix, 3, " ") + ":" + Debug.format(n, 8, 1);
  }

  static format(n, len, digits) {
    return Debug.leftJustify(n.toFixed(digits), len, " ");
  }

  // https://gist.github.com/biesiad/889139
  static leftJustify(s, length, char) {
    var fill = [];
    while (fill.length + s.length < length) {
      fill[fill.length] = char;
    }
    return fill.join('') + s;
  }

  static rightJustify(s, length, char) {
    var fill = [];
    while (fill.length + s.length < length) {
      fill[fill.length] = char;
    }
    return s + fill.join('');
  }
}

// helper for exporting Scenes
class SceneExporter {
  /* function to save JSON to file from browser
   * adapted from http://bgrins.github.io/devtools-snippets/#console-save
   * @param {Object} data -- json object to save
   * @param {String} file -- file name to save to
   */
  static saveJSON(data, filename) {

    if (!data) {
      console.error('No data')
      return;
    }

    if (!filename) filename = 'console.json'

    if (typeof data === "object") {
      data = JSON.stringify(data, undefined, 4)
    }

    var blob = new Blob([data], {
        type: 'text/json'
      }),
      e = new MouseEvent("click"),
      a = document.createElement('a')

    a.download = filename
    a.href = window.URL.createObjectURL(blob)
    a.dataset.downloadurl = ['text/json', a.download, a.href].join(':')
    // e.initMouseEvent('click', true, false, window, 0, 0, 0, 0, 0, false, false, false, false, 0, null)
    a.dispatchEvent(e)
  }
  static
  export (scene, fileName) {
    // https://threejs.org/docs/#examples/en/exporters/GLTFExporter
    // alert("scene "+scene.uuid+" to be exported");
    // Instantiate a exporter
    var exporter = new THREE.GLTFExporter();
    var options = [];
    // Parse the input and generate the glTF output
    exporter.parse(scene, function(gltf) {
      // console.log( gltf );
      SceneExporter.saveJSON(gltf, scene.name + ".glb");
    }, options);
  }
}

// helper for debugging scenes
class SceneDebug {
  constructor(scene) {
    this.scene = scene;
  }

  // show the world and local coordinates
  showObject(indent, obj) {
    if (obj.name) {
      // see https://stackoverflow.com/a/35063563/1497139
      var wt = new THREE.Vector3(),
        wr = new THREE.Quaternion(),
        ws = new THREE.Vector3();
      obj.matrixWorld.decompose(wt, wr, ws);
      var wts = Debug.asString("wx", "wy", "wz", wt)
      var wrs = Debug.asString("wrx", "wry", "wrz", wr, 180 / Math.PI);
      var sizes = "";
      var parentName = "";
      if (obj.parent)
        if (obj.parent.name)
          parentName = "parent: " + obj.parent.name;
      if (obj.userData["size"]) {
        var size = obj.userData["size"];
        sizes = Debug.asString("six", "siy", "siz", size);
      }
      console.log(Debug.rightJustify(indent + obj.name, 45, " ") +
        wts +
        wrs + sizes + parentName);
      console.log(Debug.rightJustify("", 45, " ") +
        Debug.asString("x", "y", "z", obj.position) +
        Debug.asString("rx", "ry", "rz", obj.rotation, 180 / Math.PI));
    }
  }

  showTree(indent, root) {
    this.showObject(indent, root);

    for (var childIndex in root.children) {
      var child = root.children[childIndex];
      this.showTree(indent + "  ", child);
    }
  }

  show() {
    this.showTree("", this.scene);
  }
}

var selected = 0;
var selectedObject;
var objects = [];
raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();
var zAxis = new THREE.Vector3(0, 0, 1);
var yAxis = new THREE.Vector3(0, 1, 0);
var xAxis = new THREE.Vector3(1, 0, 0);

// https://stackoverflow.com/a/32038265/1497139
THREE.Object3D.prototype.rotateAroundWorldAxis = function() {

  // rotate object around axis in world space (the axis passes through point)
  // axis is assumed to be normalized
  // assumes object does not have a rotated parent

  var q = new THREE.Quaternion();

  return function rotateAroundWorldAxis(point, axis, angle) {

    q.setFromAxisAngle(axis, angle);

    this.applyQuaternion(q);

    this.position.sub(point);
    this.position.applyQuaternion(q);
    this.position.add(point);

    return this;

  }

}();

function createPlane(planew, planel, x, y, z) {
  var plane = new THREE.Mesh(
    new THREE.PlaneBufferGeometry(planew, planel),
    new THREE.MeshPhongMaterial({
      color: 0x999999,
      specular: 0x101010
    })
  );
  plane.rotation.x = -Math.PI / 2;
  plane.position.set(x, y, z);
  return plane;
}

function createScene(near, far) {
  var scene = new THREE.Scene();
  scene.background = new THREE.Color(color);
  // see https://threejsfundamentals.org/threejs/lessons/threejs-fog.html
  scene.fog = new THREE.Fog(color, near, far);
  return scene
}

function createCamera(near, far) {
  // Camera
  var aspect = window.innerWidth / window.innerHeight;
  var camera = new THREE.PerspectiveCamera(90, aspect, near, far);
  camera.position.set(5, 10, 5);
  camera.zoom = 1;
  // default camera up position - y axis
  camera.up.set(0, 1, 0);
  // camera.lookAt(0, 1.5, 0);
  camera.updateProjectionMatrix();
  return camera;
}

function createRenderer(width, height) {
  renderer = new THREE.WebGLRenderer({
    antialias: true
  });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(width, height);
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  // renderer.shadowMap.renderSingleSided = false;
  renderer.shadowMap.enabled = true;
  return renderer;
}

// create Trackball controls see e.g.
// view-source:https://threejs.org/examples/misc_controls_trackball.html
function createTrackballControls() {
  controls = new THREE.TrackballControls(camera, renderer.domElement);
  controls.rotateSpeed = 1.0;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.noZoom = false;
  controls.noPan = false;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;
  return controls;
}

function createOrbitControls() {
  // see e.g. https://stackoverflow.com/a/53649586/1497139
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  return controls;
}

function createControls() {
  return createOrbitControls();
}

function addDragControls(objects) {
  var dragControls = new THREE.DragControls(objects, camera, renderer.domElement);
  dragControls.addEventListener('dragstart', function() {
    controls.enabled = false;
  });
  dragControls.addEventListener('dragend', function() {
    controls.enabled = true;
  });
}

function addShadowedLight(x, y, z, color, intensity, near, far, d, debug=false) {
  var directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(x, y, z);
  scene.add(directionalLight);
  if (debug) {
    var helper = new THREE.DirectionalLightHelper(directionalLight, 5);
    scene.add(helper);
  }
  directionalLight.castShadow = true;
  directionalLight.shadow.camera.left = -d;
  directionalLight.shadow.camera.right = d;
  directionalLight.shadow.camera.top = d;
  directionalLight.shadow.camera.bottom = -d;
  directionalLight.shadow.camera.near = near;
  directionalLight.shadow.camera.far = far;
  directionalLight.shadow.mapSize.width = 1024;
  directionalLight.shadow.mapSize.height = 1024;
  directionalLight.shadow.bias = -0.002;
  return directionalLight;
}

function animate() {
  requestAnimationFrame(animate);
  render();
}

function onDocumentMouseWheel(event) {
  var fovMAX = 160;
  var fovMIN = 1;
  camera.fov -= event.wheelDeltaY * 0.05;
  camera.fov = Math.max(Math.min(camera.fov, fovMAX), fovMIN);
  camera.projectionMatrix = new THREE.Matrix4().makePerspective(camera.fov, window.innerWidth / window.innerHeight, camera.near, camera.far);
}

// convert radians to degree
function rad2deg(rad) {
  return rad * 180 / Math.PI;
}

// convert degrees to radians
function deg2rad(deg) {
  return deg / 180 * Math.PI;
}

// to remember the marked object and it's color
var oldSelected;
var oldColor;

// log that an object has been seleted / unselected
function logSelected(prefix, selectedObject) {
  var color = "?";
  if (typeof selectedObject.material !== "undefined") {
    color = JSON.stringify(selectedObject.material.color);
  }
  var position = " position: " + JSON.stringify(selectedObject.position);
  var rotation = " rotation: " + JSON.stringify(selectedObject.rotation);
  console.log(prefix + " " + selectedObject.name + "(" + selectedObject.uuid + ")" + position + rotation + " color: " + color);
  // console.log(prefix+" oldcolor:"+JSON.stringify(oldColor)+" oldSelected:"+JSON.stringify(oldSelected));
}

function unMarkSelected(selectedObject) {
  selectedObject.material.color = oldColor;
  logSelected("unmark", selectedObject);
  oldSelected = null;
}

// mark the selected object
// and remember the old color
function markSelected(selectedObject) {
  logSelected("mark", selectedObject);
  showSelected(selectedObject);
  oldColor = selectedObject.material.color.clone();
  oldSelected = selectedObject;
  selectedObject.material.color.set(MeshFactory.getInstance().selectionColor);
}

// make name, position and rotation available
// via dat.gui if options are available
function showSelected(selectedObject) {
  // logSelected("show",selectedObject);
  if (typeof options !== "undefined") {
    options.selected = selectedObject.name;
    options.x = selectedObject.position.x;
    options.y = selectedObject.position.y;
    options.z = selectedObject.position.z;
    options.rx = rad2deg(selectedObject.rotation.x)
    options.ry = rad2deg(selectedObject.rotation.y)
    options.rz = rad2deg(selectedObject.rotation.z);
  }
}

function onDocumentMouseDown(event) {
  // https://stackoverflow.com/a/11562933/1497139
  var target = event.target || event.srcElement;
  var tag = target.tagName;
  if (tag != 'CANVAS')
    return;
  event.preventDefault();
  mouse.x = (event.clientX / renderer.domElement.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / renderer.domElement.clientHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  var intersects = raycaster.intersectObjects(objects);
  if (intersects.length > 0) {
    //intersects[ 0 ].object.material.color.set('red');
    //intersects[ 0 ].object.geometry.scale(1.1,1.1,1.1);
    if (selected === 0) {
      selected = 1;
      selectedObject = intersects[0].object;
      markSelected(selectedObject);
    } else {
      selected = 0;
      unMarkSelected(selectedObject);
    }
  }
}

/**
 *
 */
function onWindowResize() {
  var width = renderer.domElement.parentNode.offsetWidth; // window.innerWidth;
  var height = window.innerHeight; //renderer.domElement.parentNode.offsetHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
}

function addListeners() {
  window.addEventListener('resize', onWindowResize, false);
  // window.addEventListener('mousewheel', onDocumentMouseWheel, false);
  window.addEventListener('mousedown', onDocumentMouseDown, false);
}
