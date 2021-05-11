//JavaScript code for general stuff (feel free to create extra files)
// canvas object
var c;
var ctx;
var personRadiusCM;
var origin;
const exerciseFormatting = {
    "squat": "Squats",
    "pushup": "Push-Ups",
    "situp": "Sit-Ups",
    "jumpingjack": "Jumping-Jacks",
}
const fontScale = 1;
function start(){
    frames.start();
    c = document.getElementById("draw");
    ctx = c.getContext("2d");
    
    // all real-world units are in mm unless denoted by CM
    personRadiusCM = 30;
    // origin (x,y) 
    origin = [c.width/2, c.height/2];
}
var frames = {
  socket: null,
  start: function() {
    resizeCanvas();
    window.onresize = resizeCanvas;
    var ip = window.location.search;
    ip = ip.split('ip=')[1];
    console.log(`connecting to ${ip}`);
    // websocket connection location
    var url = "ws://" + ip + "/frames";


    // subscribe to the /frames data
    frames.socket = new WebSocket(url);
    frames.socket.onmessage = function(event) {
      let data = JSON.parse(event.data);
      handleData(data);
      handleCanvas(data);
      // clear the canvas
    }
  }
};
function handleCanvas(data){ //Draws people to canvas and all that
  ctx.clearRect(0, 0, c.width, c.height);
  ctx.textAlign = "center";    
  ctx.font = `${fontScale*25}px Arial`
  //Gradient
  var colors = [230, 160];
  var gradient = ctx.createLinearGradient(0, 0, 0, c.height);
  gradient.addColorStop(0, `rgb(${colors[0]}, ${colors[0]}, ${colors[0]})`);
  gradient.addColorStop(1, `rgb(${colors[1]}, ${colors[1]}, ${colors[1]})`);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, c.width, c.height);
  //Leaderboard
  ctx.fillStyle = "aliceBlue";
  const leaderboardPos = [10, 10];
  const leaderboardDim = [fontScale*300, fontScale*(50+40*Object.keys(maxCount).length)];
  const textPos = [leaderboardPos[0]+leaderboardDim[0]/2, leaderboardPos[1]];
  ctx.fillRect(leaderboardPos[0], leaderboardPos[1], leaderboardDim[0], leaderboardDim[1]);
  ctx.strokeStyle = "rgb(120, 120, 120)";
  ctx.lineWidth=1;
  ctx.rect(leaderboardPos[0], leaderboardPos[1], leaderboardDim[0], leaderboardDim[1]);
  ctx.stroke();
  ctx.fillStyle = "black";
  let texts = ["Leaderboard"];
  for(let key in maxCount){
      texts.push(`${exerciseFormatting[key]}: ${maxCount[key]}`);
  }
  for(let i = 0; i < texts.length; i++){
    let x = textPos[0];
    if(i > 0){
        x = leaderboardPos[0]+fontScale*10
        ctx.textAlign = "left";    
    }
    ctx.fillText(texts[i], x, fontScale*30+textPos[1]+fontScale*40*i);
  }
  ctx.textAlign = "center";    
  // draw the camera on the top of the screen
  drawEnv(ctx, origin);

  var i = 0;
  var person_scale = 0.25;
  ctx.font = `${fontScale*12}px Arial`
  if (data.people) {
    var num_people = Object.keys(data.people).length;
    //console.log(num_people);
    for (const [idx, person] of Object.entries(data.people)) {
      ctx.lineWidth = 3;        
      keypoints = count[person.idx].smoothedKeypoints;
      var countX = (keypoints.LShoulder[0]*person_scale * (-1) + origin[0] + keypoints.RShoulder[0]*person_scale * (-1) + origin[0])/2;
      var countY = (keypoints.LShoulder[1]*person_scale + origin[1] + keypoints.RShoulder[1]*person_scale + origin[1])/2 - 50;

      var mostProgress = ["None", 0];
      for(let poseKey in poseData){
        let completeness = count[person.idx][poseKey].count+(1+count[person.idx][poseKey].lastPosition)/poseData[poseKey].length; //Scaling each exercise to each other in stages
        if(completeness > mostProgress[1]){
          mostProgress = [poseKey, completeness];
        }
      }
      var headText = ""
      if(mostProgress[0] == "None"){
        headText = "Try doing a squat or jumping jack!";
      }
      else{
        headText = `${exerciseFormatting[mostProgress[0]]}: ${count[person.idx][mostProgress[0]].count}`;
      }
      var colorScale = mostProgress[1]-Math.floor(mostProgress[1]); //Gets the progress amount
      ctx.strokeStyle = ctx.fillStyle = `rgb(0, ${colorScale}, 0)`;
      if(countX && countY){
        ctx.fillText(headText, countX, countY);
      }

      ctx.beginPath();

      if(keypoints.LShoulder && keypoints.RShoulder){
        canvas_line(ctx,
          keypoints.LShoulder[0]*person_scale * (-1) + origin[0],
          keypoints.LShoulder[1]*person_scale + origin[1],
          keypoints.RShoulder[0]*person_scale * (-1) + origin[0],
          keypoints.RShoulder[1]*person_scale + origin[1]);
      }
      if(keypoints.LShoulder && keypoints.LHip){
        canvas_line(ctx,
          keypoints.LShoulder[0]*person_scale * (-1) + origin[0],
          keypoints.LShoulder[1]*person_scale + origin[1],
          keypoints.LHip[0]*person_scale * (-1) + origin[0],
          keypoints.LHip[1]*person_scale + origin[1]);
      }
      if(keypoints.RShoulder && keypoints.RHip){
        canvas_line(ctx,
          keypoints.RShoulder[0]*person_scale * (-1) + origin[0],
          keypoints.RShoulder[1]*person_scale + origin[1],
          keypoints.RHip[0]*person_scale * (-1) + origin[0],
          keypoints.RHip[1]*person_scale + origin[1]);
      }
      if(keypoints.LHip && keypoints.RHip){
        canvas_line(ctx,
          keypoints.LHip[0]*person_scale * (-1) + origin[0],
          keypoints.LHip[1]*person_scale + origin[1],
          keypoints.RHip[0]*person_scale * (-1) + origin[0],
          keypoints.RHip[1]*person_scale + origin[1]);
      }
      if(keypoints.LHip && keypoints.LKnee){
        canvas_line(ctx,
          keypoints.LHip[0]*person_scale * (-1) + origin[0],
          keypoints.LHip[1]*person_scale + origin[1],
          keypoints.LKnee[0]*person_scale * (-1) + origin[0],
          keypoints.LKnee[1]*person_scale + origin[1]);
      }
      if(keypoints.RHip && keypoints.RKnee){
        canvas_line(ctx,
          keypoints.RHip[0]*person_scale * (-1) + origin[0],
          keypoints.RHip[1]*person_scale + origin[1],
          keypoints.RKnee[0]*person_scale * (-1) + origin[0],
          keypoints.RKnee[1]*person_scale + origin[1]);
      }
      if(keypoints.LKnee && keypoints.LAnkle){
        canvas_line(ctx,
          keypoints.LKnee[0]*person_scale * (-1) + origin[0],
          keypoints.LKnee[1]*person_scale + origin[1],
          keypoints.LAnkle[0]*person_scale * (-1) + origin[0],
          keypoints.LAnkle[1]*person_scale + origin[1]);
      }
      else if(keypoints.LAnkle && keypoints.LHip){ //Ignores knees if it has to
        canvas_line(ctx,
          keypoints.LAnkle[0]*person_scale * (-1) + origin[0],
          keypoints.LAnkle[1]*person_scale + origin[1],
          keypoints.LHip[0]*person_scale * (-1) + origin[0],
          keypoints.LHip[1]*person_scale + origin[1]);
      }
      if(keypoints.RKnee && keypoints.RAnkle){
        canvas_line(ctx,
          keypoints.RKnee[0]*person_scale * (-1) + origin[0],
          keypoints.RKnee[1]*person_scale + origin[1],
          keypoints.RAnkle[0]*person_scale * (-1) + origin[0],
          keypoints.RAnkle[1]*person_scale + origin[1]);
      }
      else if(keypoints.RAnkle && keypoints.RHip){
        canvas_line(ctx,
          keypoints.RAnkle[0]*person_scale * (-1) + origin[0],
          keypoints.RAnkle[1]*person_scale + origin[1],
          keypoints.RHip[0]*person_scale * (-1) + origin[0],
          keypoints.RHip[1]*person_scale + origin[1]);
      }
      if(keypoints.LShoulder && keypoints.LElbow){
        canvas_line(ctx,
          keypoints.LShoulder[0]*person_scale * (-1) + origin[0],
          keypoints.LShoulder[1]*person_scale + origin[1],
          keypoints.LElbow[0]*person_scale * (-1) + origin[0],
          keypoints.LElbow[1]*person_scale + origin[1]);
      }
      if(keypoints.RShoulder && keypoints.RElbow){
        canvas_line(ctx,
          keypoints.RShoulder[0]*person_scale * (-1) + origin[0],
          keypoints.RShoulder[1]*person_scale + origin[1],
          keypoints.RElbow[0]*person_scale * (-1) + origin[0],
          keypoints.RElbow[1]*person_scale + origin[1]);
      }
      if(keypoints.LElbow && keypoints.LWrist){
        canvas_line(ctx,
          keypoints.LElbow[0]*person_scale * (-1) + origin[0],
          keypoints.LElbow[1]*person_scale + origin[1],
          keypoints.LWrist[0]*person_scale * (-1) + origin[0],
          keypoints.LWrist[1]*person_scale + origin[1]);
      }
      if(keypoints.RElbow && keypoints.RWrist){
        canvas_line(ctx,
          keypoints.RElbow[0]*person_scale * (-1) + origin[0],
          keypoints.RElbow[1]*person_scale + origin[1],
          keypoints.RWrist[0]*person_scale * (-1) + origin[0],
          keypoints.RWrist[1]*person_scale + origin[1]);
      }
      ctx.stroke();
    }
  }
}
const resizeCanvas = () => { //from: https://stackoverflow.com/questions/4288253/html5-canvas-100-width-height-of-viewport
    canvas = document.getElementById("draw");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
// Helper Functions

// Convert MM to CM
function toCM(mm) {
  return mm/10;
}

// Draw an arrow
// from: https://stackoverflow.com/questions/808826/draw-arrow-on-canvas-tag#answer-6333775
function canvas_arrow(context, fromx, fromy, tox, toy) {
  var headlen = 10; // length of head in pixels
  var dx = tox - fromx;
  var dy = toy - fromy;
  var angle = Math.atan2(dy, dx);
  context.moveTo(fromx, fromy);
  context.lineTo(tox, toy);
  context.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
  context.moveTo(tox, toy);
  context.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
}

function canvas_line(context, fromx, fromy, tox, toy) {
  context.moveTo(fromx, fromy);
  context.lineTo(tox, toy);
}

// Setup an array of colors
// var tc = tinycolor({
//   r: Math.floor(Math.random() * 0xFF),
//   g: Math.floor(Math.random() * 0xFF),
//   b: Math.floor(Math.random() * 0xFF)
// });
// colors = [];
// var parts = 2 + Math.floor(Math.random() * 5);
// for (var i = 0; i < parts; i++) {
//   tc = tc.spin(360 / parts);
//   colors.push('#' + tc.toHex());
// }

// Draw the environment
function drawEnv(ctx, origin) {
  // var cameraSizeCM = [15, 5];

  // ctx.strokeStyle = ctx.fillStyle = '#333333';
  // ctx.fillRect(origin[0], origin[1]-cameraSizeCM[1]/2, cameraSizeCM[0], cameraSizeCM[1])

  // ctx.font = "25px Arial";
  // ctx.fillText("x", 90, 20);
  // ctx.fillText("y", 8, 100);
  // ctx.beginPath();
  // canvas_arrow(ctx, 14, 14, 14, 80);
  // canvas_arrow(ctx, 14, 14, 80, 14);
  // ctx.stroke();

  // ctx.beginPath();
  // ctx.strokeStyle = ctx.fillStyle = '#0000FF';
  // canvas_arrow(ctx, origin[0]+cameraSizeCM[0]/2, 1.5, origin[0]+cameraSizeCM[0]/2, 20);
  // ctx.stroke();

  // ctx.beginPath();
  // ctx.strokeStyle = ctx.fillStyle = '#FF0000';
  // canvas_arrow(ctx, origin[0]+cameraSizeCM[0]/2, 1.5, origin[0]+cameraSizeCM[0]/2-20, 1.5);
  // ctx.stroke();
}
