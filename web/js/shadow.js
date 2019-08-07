// http://jsfiddle.net/Rhtr2/58/
var scene, camera, renderer, cube, cubeM, terrain, spot;

scene = new THREE.Scene();

camera = new THREE.PerspectiveCamera(50, 400 / 300, 0.01, 100);
camera.position.set(0.4, 0, 5);
scene.add(camera);

var renderer = createRenderer(window.innerWidth, window.innerHeight);

document.body.appendChild(renderer.domElement);

cubeM = new THREE.MeshPhongMaterial({
    color: 0xff0000
});

cube = new THREE.Mesh(
new THREE.CubeGeometry(1, 1, 1), cubeM);
cube.position.set(0, 0, 0);
cube.rotation.set(0, 0, 0);
scene.add(cube);
objects.push(cube);
//cube.receiveShadow = true;
cube.castShadow = true;

terrain = new THREE.Mesh(
new THREE.CubeGeometry(10, 1, 10), new THREE.MeshPhongMaterial({
    color: 0x00ff00
}));
//terrain.castShadow = true;
terrain.receiveShadow = true;
terrain.position.set(0, -2, 0);
terrain.rotation.set(0, 0, 0);

scene.add(terrain);

spot = new THREE.SpotLight();
spot.shadow.camera.near = 1; // keep near and far planes as tight as possible
spot.shadow.camera.far = 10; // shadows not cast past the far plane

//Un-Comment this
spot.castShadow = true;
spot.position.set(-1, 2, 1.5)
scene.add(spot);
addListeners();

(function animate() {

    requestAnimationFrame(animate);

    cube.rotation.x += 0.01;
    cube.rotation.y += 0.01;

    renderer.render(scene, camera);
})();
