
// create a scene
near = 1;
far = 1000;
//color=0x72645b; // brown
color = 0x66ccff; // sky blue
var scene = createScene(near, far, color);
var plane = createPlane(far / 2, far / 2, 0, 0, 0);
scene.add(plane);
plane.receiveShadow = true;

var axesHelper = new THREE.AxesHelper(far / 2);
scene.add(axesHelper);

var camera = createCamera(near, far);

// var controls = new THREE.OrbitControls( camera );

// https://www.w3schools.com/colors/colors_picker.asp
var light0 = new THREE.HemisphereLight(0x443333, 0x111122);
scene.add(light0);
var light1 = addShadowedLight(420, 380, 450, 0xffffff, 1.0, 1, far * 1.5, 150);
var light2 = addShadowedLight(250, 250, -350, 0xffaa00, 0.1, 1, far * 1.5, 150);

var light3 = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(light3);

// Light
/*
var light = new THREE.DirectionalLight(0xffffff, 1.0);
light.position.set(10, 5, 10);
light.target = base;
scene.add(light);
*/

// Options (DAT.GUI)
var options = {
  zoom: 1,
  controls: true,
  rotation: true,
  rotateX: false,
  rotateY: false,
  rotateZ: false,
  byAxis: true,
  x: 0,
  y: 0,
  z: 0,
  px: 0,
  py: 0,
  pz: 0,
  rx: 0,
  ry: 0,
  rz: 0,
  lightx: 430,
  lighty: 380,
  lightz: 450,
  light0i: 0.1,
  light1i: 1.0,
  light2i: 0.2,
  light3i: 0.1,
  camerax: 8,
  cameray: 200,
  cameraz: -147,
  rotate: 0,
  selected: '',
  revision: THREE.REVISION,
  screenwidth: screen.width,
  screenheight: screen.height
};

var robot;
// DAT.GUI Related Stuff
var gui = new dat.GUI();
infoFolder = gui.addFolder('info')
infoFolder.add(options, 'revision').listen();
infoFolder.add(options, 'screenwidth').listen();
infoFolder.add(options, 'screenheight').listen();
gui.add(options, 'zoom', 0.1, 10).listen();
gui.add(options, 'controls').listen();
gui.add(options, 'rotation').listen();
gui.add(options, 'rotateX').listen();
gui.add(options, 'rotateY').listen();
gui.add(options, 'rotateZ').listen();
gui.add(options, 'byAxis').listen();
gui.add(options, 'px', -200, 200).listen();
gui.add(options, 'py', -200, 200).listen();
gui.add(options, 'pz', -200, 200).listen();
gui.add(options, 'selected').listen();
posFolder = gui.addFolder('position')
posFolder.add(options, 'x', -200, 200).listen();
posFolder.add(options, 'y', -200, 200).listen();
posFolder.add(options, 'z', -200, 200).listen();
posFolder.add(options, 'rx', 0, 360).listen();
posFolder.add(options, 'ry', 0, 360).listen();
posFolder.add(options, 'rz', 0, 360).listen();
lightFolder = gui.addFolder('light')
lightFolder.add(options, 'lightx', -1000, 1000).listen();
lightFolder.add(options, 'lighty', 0, 1000).listen();
lightFolder.add(options, 'lightz', -1000, 1000).listen();
lightFolder.add(options, 'light0i', 0, 1.5).listen();
lightFolder.add(options, 'light1i', 0, 1.5).listen();
lightFolder.add(options, 'light2i', 0, 1.5).listen();
lightFolder.add(options, 'light3i', 0, 1.5).listen();
cameraFolder = gui.addFolder('camera')
cameraFolder.add(options, 'camerax', -200, 200).listen();
cameraFolder.add(options, 'cameray', -200, 200).listen();
cameraFolder.add(options, 'cameraz', -200, 200).listen();
cameraFolder.add(options, 'rotate', 0, 50).listen();
// Rendering
var zAxis = new THREE.Vector3(0, 0, 1);
var yAxis = new THREE.Vector3(0, 1, 0);
var xAxis = new THREE.Vector3(1, 0, 0);

// prepare Renderer
var renderContainer=document.body;
var renderWidth=window.innerWidth;
var renderHeight=window.innerHeight;

// are we configured to run in dom element e.g. div?
if (typeof renderId !== 'undefined') {
  renderContainer= document.getElementById(renderId);
  renderWidth=renderContainer.offsetWidth;
  renderHeight=renderContainer.offsetHeight;
  if (renderHeight==0)
    renderHeight=window.innerHeight;
}
console.log("creating "+renderWidth+" x "+renderHeight+" renderer")
var renderer = createRenderer(renderWidth,renderHeight);
renderContainer.appendChild(renderer.domElement);

controls = createControls();
camera.position.set(options.camerax, options.cameray, options.cameraz);
console.log(JSON.stringify(camera.position));

addDragControls(objects);

// default material to be used in MeshFactory
/* var material = new THREE.MeshPhongMaterial({
  color: 0x0033ff,
  specular: 0x555555,
  shininess: 200
});
*/
var material = new THREE.MeshPhongMaterial({
  color: 0xFFFFFF, // light gray
  specular: 0x111111, // very dark grey
  shininess: 50
});

var loader = new THREE.STLLoader();
// create MeshFactory - available via MeshFactory.getInstance()
var meshFactory = new MeshFactory(scene,loader,material, 64);

const urlParams = new URLSearchParams(window.location.search);
urlParams.forEach((value, key) => {
  if (key in options) {
    console.log('setting option ', key, '=', value);
    options[key] = value;
  } else if (key = 'robot') {
    // https://stackoverflow.com/a/43175774/1497139
    robotUrl = value;
  }
});

var robot=null;

if (typeof robotUrl === "undefined") {
  alert('missing robot json definition - robotUrl is undefined');
} else {
  console.log('getting robot model from ' + robotUrl);
  fetch(robotUrl)
    .then(res => res.json())
    .then((robotObj) => {
      console.log('Checkout this JSON! ', robotObj);
      robot = Robot.fromJsonObj(robotObj);
      robot.setDebug(true);
      robot.loadParts(function whenIntegrated() {
        robot.addGUI(gui,options);
      });
    })
    .catch(err => {
      throw err
    });
}

var render = function() {
  // https://stackoverflow.com/questions/19426559/three-js-access-scene-objects-by-name-or-id

  if (options.rotation) {
    if (robot)
      robot.rotateJoints(scene,options);
  }
  movep = selectedObject;
  if (movep) {
    movep.position.x = options.x;
    movep.position.y = options.y;
    movep.position.z = options.z;
    movep.rotation.x = deg2rad(options.rx);
    movep.rotation.y = deg2rad(options.ry);
    movep.rotation.z = deg2rad(options.rz);
  }
  if (options.zoom > 0) {
    camera.zoom = options.zoom * 1.0;
  } else {
    camera.zoom = 1 / options.zoom;
  }
  controls.enabled = options.controls;
  if (controls.enabled) {
    controls.update();
  } else {
    camera.lookAt(scene.position);
    camera.updateProjectionMatrix();
  }
  if (options.rotate > 0) {
    var timer = Date.now() * 0.00001 * options.rotate;
    r = 150;
    dx = r * Math.cos(timer);
    dz = r * Math.sin(timer);
    camera.position.x = dx
    options.camerax = dx;
    camera.position.z = dz
    options.cameraz = dz;
    camera.position.y = options.cameray;
  } else {
    options.camerax = camera.position.x;
    options.cameray = camera.position.y;
    options.cameraz = camera.position.z;
    options.zoom = camera.zoom;
  }

  light1.position.set(options.lightx, options.lighty, options.lightz);
  light0.intensity = options.light0i;
  light1.intensity = options.light1i;
  light2.intensity = options.light2i;
  light3.intensity = options.light3i;

  // Render
  renderer.render(scene, camera);
};

addListeners();
animate();
