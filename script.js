var scene, sceneGroup, camera, renderer, clock, deltaTime, totalTime;

var arToolkitSource, arToolkitContext;
var shadowMesh;

var markerRoot1;

var material1, mesh1;
let localStream;
let ballMesh = null;
let isDrawing = false;
let floorMesh = null;

const floorX = 5;
const floorY = 5;
const maxBallHeight = 1.0;

let p = 0.5;
const ballPosition = new THREE.Vector3(0.3, 0.5, p);

var lineMesh = null;
var points = [];

const lineMaterial = new MeshLineMaterial({
  color: 0xffffff,
  lineWidth: 0.2
});

let triangleMesh = null;

const distance = 0.5;

//0->webcam
//1->webrtc
//2->image
let arToolkitSourceMode = 2;



// カメラ映像取得
if (arToolkitSourceMode == 0) {
  arToolkitSource = new THREEx.ArToolkitSource({sourceType: 'video'});
  navigator.mediaDevices.getUserMedia({video: true, audio: false})
    .then(stream => {
      arToolkitSource.domElement.srcObject = stream;
    }).catch(error => {
      // 失敗時にはエラーログを出力
      console.error('mediaDevice.getUserMedia() error:', error);
      return;
    });
} else if (arToolkitSourceMode == 1){
  arToolkitSource = new THREEx.ArToolkitSource({sourceType: 'video'});

  //Peer作成

  const peer = new Peer("seimitsu_client", {
    key: '4ba9990d-4f5d-4948-a40c-8a75e3489885',
    debug: 3
  });
  // 発信処理

  //PeerID取得
  peer.on('open', () => {
    // document.getElementById('my-id').textContent = peer.id;
  });

  // イベントリスナを設置する関数
  const setEventListener = mediaConnection => {
    mediaConnection.on('stream', stream => {
        arToolkitSource.domElement.srcObject = stream;

    });
  }
  // document.getElementById('make-call').onclick = () => {
  //   // const theirID = document.getElementById('their-id').value;
  //   const theirID = "seimitsu_host"
  //   const mediaConnection = peer.call(theirID, localStream);
  //   setEventListener(mediaConnection);
  // };

  peer.on('call', mediaConnection => {
    mediaConnection.answer(localStream);
    setEventListener(mediaConnection);
  });
}else{
arToolkitSource = new THREEx.ArToolkitSource({
  sourceType: 'image',
  sourceUrl: './images/artoolkitsource_image.jpg'
});

}
let raycaster = null;
let mouse = null;
initialize();
animate();

function initialize() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera();
  scene.add(camera);

  renderer = new THREE.WebGLRenderer({
    // canvas: document.getElementById('output'),
    antialias: true,
    alpha: true
  });
  renderer.setClearColor(new THREE.Color('lightgrey'), 0)
  renderer.setSize(1920, 1080);
  renderer.domElement.style.position = 'absolute'
  renderer.domElement.style.top = '0px'
  renderer.domElement.style.left = '0px'
  raycaster = new THREE.Raycaster();
  mouse = new THREE.Vector2();
  renderer.domElement.addEventListener('mousedown', event => {
    const element = event.currentTarget;
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    isDrawing = true;
  })
  renderer.domElement.addEventListener('mouseup', _=> {
    isDrawing = false;
  })
  renderer.domElement.addEventListener('mousemove', event => {
    if (isDrawing) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }
  })

  renderer.domElement.addEventListener('touchstart', event => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    isDrawing = true;
  })
  renderer.domElement.addEventListener('touchend', event => {
    isDrawing = false;
  })
  renderer.domElement.addEventListener('touchmove', event => {
    event.preventDefault();
    if (isDrawing) {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = - (event.clientY / window.innerHeight) * 2 + 1;
    }
  })

  document.body.appendChild(renderer.domElement);

  clock = new THREE.Clock();
  deltaTime = 0;
  totalTime = 0;

  ////////////////////////////////////////////////////////////
  // setup arToolkitSource
  ////////////////////////////////////////////////////////////


  function onResize() {
    arToolkitSource.onResize()
    arToolkitSource.copySizeTo(renderer.domElement)
    if (arToolkitContext.arController !== null) {
      arToolkitSource.copySizeTo(arToolkitContext.arController.canvas)
    }
  }

  arToolkitSource.init(() => {
    let rootDiv = document.getElementById("canvas_wrapper")
    rootDiv.appendChild(arToolkitSource.domElement);
    onResize();
  });

  // handle resize event
  window.addEventListener('resize', function () {
    onResize()
  });

  ////////////////////////////////////////////////////////////
  // setup arToolkitContext
  ////////////////////////////////////////////////////////////	

  // create atToolkitContext
  arToolkitContext = new THREEx.ArToolkitContext({
    cameraParametersUrl: 'data/camera_para.dat',
    detectionMode: 'mono'
  });

  // copy projection matrix to camera when initialization complete
  arToolkitContext.init(function onCompleted() {
    camera.projectionMatrix.copy(arToolkitContext.getProjectionMatrix());
  });

  ////////////////////////////////////////////////////////////
  // setup markerRoots
  ////////////////////////////////////////////////////////////

  // build markerControls
  markerRoot1 = new THREE.Group();
  scene.add(markerRoot1);
  let markerControls1 = new THREEx.ArMarkerControls(arToolkitContext, markerRoot1, {
    type: 'pattern', patternUrl: "data/hiro.patt",
  })

  ////////////////////////////////////////////////////////////
  // setup scene
  ////////////////////////////////////////////////////////////

  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  sceneGroup = new THREE.Group();

  markerRoot1.add(sceneGroup);

  let floorGeometry = new THREE.PlaneGeometry(floorX, floorY);
  let floorMaterial = new THREE.MeshBasicMaterial({color: 0x5f5f5f});
  floorMaterial.opacity = 0.8;
  floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
  floorMesh.rotation.x = -Math.PI / 2;
  sceneGroup.add(floorMesh);

  const ballMaterial = new THREE.MeshBasicMaterial({color: 0xffff00});
  ballMesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.5, 32, 32),
    ballMaterial
  );
  ballMesh.position.copy(ballPosition);
  sceneGroup.add(ballMesh);

  shadowMesh = new THREE.Mesh(
    new THREE.CircleGeometry(0.5, 32),
    new THREE.MeshBasicMaterial({color: 0x0f0f0f})
  )
  shadowMesh.rotation.x = -Math.PI / 2;
  shadowMesh.position.set(ballPosition.x, 0, ballPosition.z);
  sceneGroup.add(shadowMesh);

  ////////////   Triangle   ///////////////

  let triangleGeometry = new THREE.Geometry();
  triangleGeometry.vertices.push(
    new THREE.Vector3(0.0, 0.0, -0.5),
    new THREE.Vector3(0.0, 0.0, 0.5),
    new THREE.Vector3(0.5, 0.0, 0.0)
  )
  triangleGeometry.faces[0] = new THREE.Face3(0,1,2);
  let triangleMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  triangleMesh = new THREE.Mesh(triangleGeometry, triangleMaterial);
  triangleMesh.position.set(0.3, 0.0, 0.5);
  sceneGroup.add(triangleMesh);
  
  /////////////////////////////////////////

  let light = new THREE.PointLight(0xffffff, 1, 100);
  light.position.set(0, 4, 0); // default; light shining from top
  light.castShadow = true;
  sceneGroup.add(light);

  let lightSphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8
    })
  );
  lightSphere.position.copy(light.position);
  sceneGroup.add(lightSphere);

  let ambientLight = new THREE.AmbientLight(0x666666);
  sceneGroup.add(ambientLight);
  // let helper = new THREE.CameraHelper( light.shadow.camera );
  // sceneGroup.add( helper );
}


function update() {
  // update artoolkit on every frame
  if (arToolkitSource.ready !== false)
    arToolkitContext.update(arToolkitSource.domElement);

  ballMesh.position.y = maxBallHeight * (document.getElementById("ball_height").value / 100);
  triangleMesh.rotation.y = document.getElementById("ball_rotation").value * Math.PI / 180;

  if (isDrawing) {
    raycaster.setFromCamera(mouse, camera);
    let intersects = raycaster.intersectObjects([floorMesh]);
    if (intersects.length == 0) return
    let point = sceneGroup.worldToLocal(intersects[0].point)
    shadowMesh.position.copy(point);
    ballMesh.position.x = shadowMesh.position.x;
    ballMesh.position.z = shadowMesh.position.z;
    triangleMesh.position.x = shadowMesh.position.x;
    triangleMesh.position.z = shadowMesh.position.z;
  }
  
  let num = points.length - 1;
  let pos = ballMesh.position;
  // if distance is larger than 0.5, the point is recorded.
  let do_add = points.length > 0 ? (Math.hypot(points[num].x-pos.x,points[num].z-pos.z)>distance) || (Math.abs(points[num].y-pos.y)>distance): true;
  if(do_add){
    sceneGroup.remove(lineMesh);
    points.push(_.cloneDeep(ballMesh.position))
    let line = new MeshLine();
    line.setPoints(points);
    lineMesh = new THREE.Mesh(line, lineMaterial);
    sceneGroup.add(lineMesh);
  }
}

function Reset() {
  sceneGroup.remove(lineMesh);
  points.length = 0;
  ballMesh.position.set(ballPosition.x, ballPosition.y, ballPosition.z);
  shadowMesh.position.set(ballMesh.position.x, 0.0, ballMesh.position.z);
  triangleMesh.position.set(shadowMesh.position.x, 0.0, shadowMesh.position.z);
  let sliderHeightID = document.getElementById('ball_height');
  sliderHeightID.value = 50;
  let sliderRotationID = document.getElementById('ball_rotation');
  sliderRotationID.value = 0;
}

function render() {
  renderer.render(scene, camera);
}


function animate() {
  requestAnimationFrame(animate);
  deltaTime = clock.getDelta();
  totalTime += deltaTime;
  update();
  render();
}
