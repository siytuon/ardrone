var scene, sceneGroup, camera, renderer, clock, deltaTime, totalTime;

var arToolkitSource, arToolkitContext;
var shadowMesh;

var markerRoot1;

var visibletf;

var material1, mesh1;

let peer, peer_data
let localStream;
let ballMesh = null;
let isDrawing = false;
let floorMesh = null;

// drone_test
let firstrecog = false;

/*4/4変更済み
const floorX = 10;
const floorY = 10;
const maxBallHeight = 6.0;
 
*/

let p = 0.5;
const ballPosition = new THREE.Vector3(0.3, 0.5, p);
// Tello側に謎の数が送られてくる関係で (0.3,0.5,p)から(0.0,0.0,p)に変更
var lineMesh = null;
var points = [];
var conn;     // データ通信用connectionオブジェクトの保存用変数 大塚
var conn_data; 
var contena = 0;

const lineMaterial = new MeshLineMaterial({
  color: 0xffffff,
  lineWidth: 0.3
});



let triangleMesh = null;

const distance = 0.5;

//0->webcam
//1->webrtc
//2->image
let arToolkitSourceMode = 0;


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
  if(SKYWAY_API_KEY == "YOUR_KEY"){
    window.alert("change your api key in const.js");
  }

  peer = new Peer("seimitsu_project_client", {
    key: SKYWAY_API_KEY,
    debug: 3
  });

  //Peer_data作成


  peer_data = new Peer("seimitsu_project_client_data", {
    key: SKYWAY_API_KEY,
    debug: 3
  });
  // 発信処理



  //データ通信が繋がった時の処理
  peer_data.on('open', function() {
    conn_data = peer_data.connect("seimitsu_project_host_data");//相手への接続を開始する大塚、ここを入れると映像が映らなくなった
    contena = 1;
    console.log(1)
    conn_data.on("open", function() {//ここ変えたらエラー出なくなった =>みたいなのはダメみたい？
      const data = {
        name: "SkyWay",
        msg: "Hello, World!",
      };
      conn_data.send(data);
      console.log(2)
    });
  });




  //PeerID取得
  peer.on('open', function() {
    conn = peer.connect("seimitsu_project_host");
    document.getElementById('my-id').textContent = peer.id;//自分のidを取得する。意味のないことだけど一応残しておいた
  });




  // イベントリスナを設置する関数
  const setEventListener = mediaConnection => {
    mediaConnection.on('stream', stream => {
        arToolkitSource.domElement.srcObject = stream;

    });
  }

/*
// 相手からデータ通信の接続要求イベントが来た場合、このconnectionイベントが呼ばれる大塚
// - 渡されるconnectionオブジェクトを操作することで、データ通信が可能
peer.on('connection', function(connection){
  　
  // データ通信用に connectionオブジェクトを保存しておく
  conn = connection;

  // 接続が完了した場合のイベントの設定
  conn.on("open", function() {
      // 相手のIDを表示する
      // - 相手のIDはconnectionオブジェクトのidプロパティに存在する
      $("#peer-id").text(conn.id);
  });

  // メッセージ受信イベントの設定
  conn.on("data", onRecvMessage);
});
*/

  // document.getElementById('make-call').onclick = () => {
  //   // const theirID = document.getElementById('their-id').value;
  //   const theirID = "seimitsu_project_host"
  //   const mediaConnection = peer.call(theirID, localStream);
  //   setEventListener(mediaConnection);
  // };


  peer.on('call', mediaConnection => {
    console.log("callは受けている")
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
//conn.close();

function initialize() {
  scene = new THREE.Scene();
  scene.visible = false;

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
  markerRoot1.add(visibletf)
  // markerControls1の第二変数 markerRoot1のonoffが操作されているのでその変数を適当な変数に変えればよさそう
  let markerControls1 = new THREEx.ArMarkerControls(arToolkitContext, markerRoot1, {
    type: 'pattern', patternUrl: "data/hiro.patt", changeMatrixMode: 'modelViewMatrix'
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
//会場側から初期座標が送られてきたとき
/*なんかうまくいかないからコメントアウト
  if ( (conn != null) && (count == 0)){

    conn.on("re_data", ({ name, msg }) => 
    {

      console.log(`${name}: ${msg}`);
      if (re_data[name] == "init_position") {
        console.log(`最初のxは${re_data[msg]["x"]}`);
        console.log(`最初のyは${re_data[msg]["y"]}`);
        console.log(`最初のzは${re_data[msg]["z"]}`);
      } 
      count = 1;
    });
  }
  */
  // update artoolkit on every frame


  if (arToolkitSource.ready) {
     arToolkitContext.update(arToolkitSource.domElement);
      firstrecog = true;
      scene.visible = true;
      markerRoot1.visible = true;



  }

  if(arToolkitSource.ready == false && firstrecog == true){
     arToolkitContext.update(arToolkitSource.domElement);
    scene.visible = true;
    markerRoot1.visible = true;



  }




  ballMesh.position.y = maxBallHeight * (document.getElementById("ball_height").value / 100)
  triangleMesh.rotation.y = document.getElementById("ball_rotation").value * Math.PI / 180;

  if (isDrawing) {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObjects([floorMesh]);
    if (intersects.length == 0) return
    let point = markerRoot1.worldToLocal(intersects[0].point)
    shadowMesh.position.copy(point)
    ballMesh.position.x = shadowMesh.position.x
    ballMesh.position.z = shadowMesh.position.z
    triangleMesh.position.x = shadowMesh.position.x;
    triangleMesh.position.z = shadowMesh.position.z;
  }
  
  let num = points.length - 1;
  let pos = ballMesh.position;
  // if distance is larger than 0.5, the point is recorded.
  let do_add = points.length > 0 ? (Math.hypot(points[num].x-pos.x,points[num].z-pos.z)>distance) || (Math.abs(points[num].y-pos.y)>distance): true;

  if(do_add && (conn_data != null)){
    sceneGroup.remove(lineMesh);
    
    console.log("good");
    //conn.send("clear");// テキスト送信大塚　！！！受け取るデータ形式を受信側で指定してないとだめっみたい
            // 自分の画面に表示大塚

            const data = {
              name: "move_to_position",
              msg: {"posx":pos.x,"posy":pos.y,"posz":pos.z},//あとはここだけいじる
            };
            conn_data.send(data);
            console.log(data);
    //$("#messages").append($("<p>").html(peer_data.id + ": " + "clear"));
 
            // 送信テキストボックスをクリア大塚
    //$("#message").val("");
    
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



  const data = {
    name: "reset_is_pressed",
    msg: "reset",//あとはここだけいじる
  };
  conn_data.send(data);
  console.log(2)
}

var PassSec;
var PassageID;

function zeroPadding (num,length) {
  return ('0000000000' + num).slice(-length);
}

function showPassage() {
  var m = PassSec / 60 | 0;
  var s = PassSec % 60;
  var msg = "";
  if (m != 0) {
    msg = m + ":" + zeroPadding(s,2);
  } else if (s != 0) {
    msg = "00:" + zeroPadding(s,2);
  } else {
    msg = "Game over...";
  }
  document.getElementById("PassageArea").innerHTML = msg;
  PassSec--;
}

function Departure() {
  let start = document.getElementById('departure');
  let end = document.getElementById('arrival');
  start.style.display = "none";
  end.style.display = 'block';
  PassSec = 300;
  PassageID = setInterval('showPassage()',1000);
}

function Arrival() {
  let start = document.getElementById('departure');
  let end = document.getElementById('arrival');
  start.style.display = 'block';
  end.style.display = 'none';
  clearInterval(PassageID);
}

function render() {
  // lineGeometry.verticesNeedUpdate = true;
  renderer.render(scene, camera);
}


function animate() {
  requestAnimationFrame(animate);
  deltaTime = clock.getDelta();
  totalTime += deltaTime;
  update();
  render();
}
