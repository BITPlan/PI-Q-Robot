// create a scene
near = 1;
far = 1000;
//color=0x72645b; // brown
color = 0x66ccff; // sky blue
// main global variables
var scene, plane, camera, light0, light1, light2, light3, renderer, options, gui;


// setUp scene, camera and lights
function setUp(options) {
  scene = createScene(near, far, color);
  plane = createPlane(far / 2, far / 2, 0, 0, 0);
  scene.add(plane);
  plane.receiveShadow = true;

  camera = createCamera(near, far);
  if (options.axesHelper) {
    var axesHelper = new THREE.AxesHelper(far / 2);
    scene.add(axesHelper);
  }

  // https://www.w3schools.com/colors/colors_picker.asp
  light0 = new THREE.HemisphereLight(0x443333, 0x111122);
  scene.add(light0);
  light1 = addShadowedLight(420, 380, 450, 0xffffff, 1.0, 1, far * 1.5, 150,options.lightDebug);
  light2 = addShadowedLight(250, 250, -350, 0xffaa00, 0.1, 1, far * 1.5, 150,options.lightDebug);

  light3 = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(light3);

  // Light
  /*
  var light = new THREE.DirectionalLight(0xffffff, 1.0);
  light.position.set(10, 5, 10);
  light.target = base;
  scene.add(light);
  */
}

function setDefaultOptions() {
  // Options (DAT.GUI)
  options = {
    refresh: function() {
      // force reload from server
      // https://stackoverflow.com/a/3715053/1497139
      location.reload(true);
    },
    reload: function() {
      // initialize everything with different options
      init(false);
    },
    export: function() {
      SceneExporter.export(scene);
    },
    save: function() {
      robot.save();
    },
    rearrange: function() {
      robot.rearrange();
    },
    zoom: 1,
    controls: true,
    rotation: true,
    debug: false,
    axesHelper: false,
    lightDebug: false,
    boxwires: false,
    rotateBy: 'R',
    x: 0,
    y: 0,
    z: 0,
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
}

function prepareGUI() {
  // DAT.GUI Related Stuff
  gui.add(options, 'refresh');
  gui.add(options, 'reload');
  gui.add(options, 'save');
  gui.add(options, 'export');
  gui.add(options, 'rearrange');

  infoFolder = gui.addFolder('info');
  infoFolder.add(options, 'revision').listen();
  infoFolder.add(options, 'screenwidth').listen();
  infoFolder.add(options, 'screenheight').listen();

  debugFolder=gui.addFolder('debug');
  debugFolder.add(options, 'controls').listen();
  debugFolder.add(options, 'debug').listen();
  debugFolder.add(options, 'boxwires').listen();
  debugFolder.add(options, 'axesHelper').listen();
  debugFolder.add(options, 'lightDebug').listen();
  debugFolder.add(options, 'rotation').listen();

  gui.add(options, 'rotateBy', {
    AxisAngle: 'A',
    Rotation: 'R',
    Pivot: 'P',
    Quarternion: 'Q',
    Test: 'T'
  }).listen();
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
  cameraFolder.add(options, 'zoom', 0.1, 10).listen();
  cameraFolder.add(options, 'camerax', -200, 200).listen();
  cameraFolder.add(options, 'cameray', -200, 200).listen();
  cameraFolder.add(options, 'cameraz', -200, 200).listen();
  cameraFolder.add(options, 'rotate', 0, 50).listen();
}

// prepare Renderer
function prepareRenderer() {
  var renderContainer = document.body;
  var renderWidth = window.innerWidth;
  var renderHeight = window.innerHeight;

  // are we configured to run in dom element e.g. div?
  if (typeof renderId !== 'undefined') {
    renderContainer = document.getElementById(renderId);
    renderWidth = renderContainer.offsetWidth;
    renderHeight = renderContainer.offsetHeight;
    if (renderHeight == 0)
      renderHeight = window.innerHeight;
  }
  console.log("creating " + renderWidth + " x " + renderHeight + " renderer")
  renderer = createRenderer(renderWidth, renderHeight);
  renderContainer.appendChild(renderer.domElement);
}

// get URL Options and return the robotURL (if any)
function getURLOptions() {
  const urlParams = new URLSearchParams(window.location.search);
  urlParams.forEach((value, key) => {
    if (key in options) {
      console.log('setting option ', key, '=', value);
      // convert booleans
      if (value === 'true') value = true;
      if (value === 'false') value = false;
      options[key] = value;
    } else if (key == 'robot') {
      // https://stackoverflow.com/a/43175774/1497139
      robotUrl = value;
    }
  });
}

// prepare the STL Loader
function prepareLoader() {
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
  var meshFactory = new MeshFactory(scene, loader, material, 64);
}

// Rendering
function init(withOptions) {
  if (withOptions) {
    setDefaultOptions();
  } else {
    gui.destroy();
  }
  gui = new dat.GUI();
  // prepare Scene
  setUp(options);

  prepareGUI();
  if (withOptions) {
    prepareRenderer();
  }
  controls = createControls();

  camera.position.set(options.camerax, options.cameray, options.cameraz);
  if (options.debug)
    console.log(JSON.stringify(camera.position));

  addDragControls(objects);
  prepareLoader();
  // sets robotUrl as a side effect
  getURLOptions();
}
