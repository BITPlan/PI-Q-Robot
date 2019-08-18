var robot;

function loadRobot() {
  if (typeof robotUrl === "undefined") {
    alert('missing robot json definition - robotUrl is undefined');
  } else {
    console.log('getting robot model from ' + robotUrl);
    fetch(robotUrl)
      .then(res => res.json())
      .then((robotObj) => {
        console.log('Checkout this JSON! ', robotObj);
        robot = Robot.fromJsonObj(robotObj);
        robot.setDebug(options.debug);
        robot.boxwires = options.boxwires;
        robot.loadParts(function whenIntegrated() {
          robot.addGUI(gui, options);
          var sd = new SceneDebug(scene);
          sd.show();
        });
        if (robot.camera) {
          var cp = robot.camera;
          camera.position.set(cp.x, cp.y, cp.z);
        }
      })
      .catch(err => {
        throw err
      });
  }
}

var render = function() {
  // https://stackoverflow.com/questions/19426559/three-js-access-scene-objects-by-name-or-id

  if (options.rotation) {
    if (robot)
      robot.onRender(scene, options);
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


// start me with the default Options
init(true);
loadRobot();
addListeners();
animate();
