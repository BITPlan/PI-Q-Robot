var selected = 0;
var selectedObject;
var objects = [];
raycaster = new THREE.Raycaster();
mouse = new THREE.Vector2();

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

function createControls() {
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

function addDragControls(objects) {
  var dragControls = new THREE.DragControls(objects, camera, renderer.domElement);
  dragControls.addEventListener('dragstart', function() {
    controls.enabled = false;
  });
  dragControls.addEventListener('dragend', function() {
    controls.enabled = true;
  });
}

function addShadowedLight(x, y, z, color, intensity, near, far, d) {
  var directionalLight = new THREE.DirectionalLight(color, intensity);
  directionalLight.position.set(x, y, z);
  scene.add(directionalLight);
  var helper = new THREE.DirectionalLightHelper(directionalLight, 5);
  scene.add(helper);
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
function logSelected(prefix,selectedObject) {
  var color="?";
  if (typeof selectedObject.material !== "undefined" ) {
    color=JSON.stringify(selectedObject.material.color);
  }
  var position=" position: "+JSON.stringify(selectedObject.position);
  var rotation=" rotation: "+JSON.stringify(selectedObject.rotation);
  console.log(prefix+" "+selectedObject.name+"("+selectedObject.uuid + ")" + position + rotation + " color: "+color);
  // console.log(prefix+" oldcolor:"+JSON.stringify(oldColor)+" oldSelected:"+JSON.stringify(oldSelected));
}

function unMarkSelected(selectedObject) {
  selectedObject.material.color=oldColor;
  logSelected("unmark",selectedObject);
  oldSelected=null;
}

// mark the selected object
// and remember the old color
function markSelected(selectedObject) {
  logSelected("mark",selectedObject);
  showSelected(selectedObject);
  oldColor = selectedObject.material.color.clone();
  oldSelected = selectedObject;
  selectedObject.material.color.set('blue');
}

// make name, position and rotation available
// via dat.gui if options are available
function showSelected(selectedObject) {
  // logSelected("show",selectedObject);
  if (typeof options !== "undefined" ) {
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
  var width=renderer.domElement.parentNode.offsetWidth; // window.innerWidth;
  var height=window.innerHeight; //renderer.domElement.parentNode.offsetHeight;
  camera.aspect = width/height;
  camera.updateProjectionMatrix();
  renderer.setSize(width,height);
}

function addListeners() {
  window.addEventListener('resize', onWindowResize, false);
  // window.addEventListener('mousewheel', onDocumentMouseWheel, false);
  window.addEventListener('mousedown', onDocumentMouseDown, false);
}
