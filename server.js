<!DOCTYPE html>
<html>
<head>
<title>Iftar Meet Scanner</title>

<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#000000">

<script src="https://unpkg.com/html5-qrcode"></script>

<style>

/* viewport background */

html{
height:100%;
background:linear-gradient(135deg,#000000,#15122a);
overscroll-behavior:none;
}

/* body */

body{
margin:0;
min-height:100vh;
font-family:Arial, sans-serif;
background:linear-gradient(135deg,#000000,#15122a);
color:white;
text-align:center;
padding:20px;
overscroll-behavior:none;
}

/* header */

.header{
padding:15px;
font-size:26px;
font-weight:bold;
}

/* container */

.container{
max-width:420px;
margin:auto;
background:#111;
padding:25px;
border-radius:14px;
box-shadow:0 10px 25px rgba(0,0,0,0.5);
}

/* dashboard */

.stats{
display:flex;
justify-content:space-between;
margin-bottom:20px;
gap:10px;
}

.box{
background:#1a1a1a;
padding:12px;
border-radius:8px;
flex:1;
}

.num{
font-size:22px;
font-weight:bold;
}

.label{
font-size:12px;
color:#bbb;
}

/* scanner */

#reader{
width:100%;
margin-top:10px;
border-radius:10px;
overflow:hidden;
}

/* result */

#result{
margin-top:20px;
font-size:20px;
font-weight:bold;
padding:15px;
border-radius:8px;
display:none;
}

.valid{
background:#28a745;
}

.used{
background:#dc3545;
}

.invalid{
background:#ffc107;
color:black;
}

/* button */

button{
margin-top:15px;
padding:12px 20px;
font-size:16px;
border:none;
border-radius:6px;
cursor:pointer;
background:#fff;
color:#000;
width:100%;
}

button:hover{
background:#ddd;
}

/* mobile */

@media (max-width:480px){

.header{
font-size:22px;
}

.num{
font-size:20px;
}

.container{
padding:20px;
}

}

</style>

</head>

<body>

<div class="header">
Iftar Meet Scanner
</div>

<div class="container">

<!-- Dashboard -->

<div class="stats">

<div class="box">
<div class="num" id="total">0</div>
<div class="label">Total</div>
</div>

<div class="box">
<div class="num" id="checked">0</div>
<div class="label">Checked</div>
</div>

<div class="box">
<div class="num" id="remaining">0</div>
<div class="label">Remaining</div>
</div>

</div>

<!-- Scanner -->

<div id="reader"></div>

<div id="result"></div>

<button onclick="restartScanner()" id="scanAgain" style="display:none;">
Scan Next Ticket
</button>

</div>

<script>

let scanner;

/* Load stats */

function loadStats(){

fetch("/stats")
.then(res=>res.json())
.then(data=>{

document.getElementById("total").innerText=data.total;
document.getElementById("checked").innerText=data.checked;
document.getElementById("remaining").innerText=data.remaining;

});

}

loadStats();
setInterval(loadStats,5000);

/* QR success */

function onScanSuccess(decodedText){

scanner.clear();

fetch("/checkin",{
method:"POST",
headers:{
"Content-Type":"application/json"
},
body:JSON.stringify({ticket:decodedText})
})
.then(res=>res.text())
.then(data=>{

const resultBox=document.getElementById("result");

resultBox.style.display="block";

/* valid */

if(data.includes("Welcome")){

resultBox.className="valid";
resultBox.innerText=data;

/* used */

}else if(data.includes("Already")){

resultBox.className="used";
resultBox.innerText=data;

/* invalid */

}else{

resultBox.className="invalid";
resultBox.innerText=data;

}

document.getElementById("scanAgain").style.display="block";

loadStats();

});

}

/* start scanner */

function startScanner(){

scanner=new Html5QrcodeScanner(
"reader",
{
fps:10,
qrbox:{width:250,height:250}
}
);

scanner.render(onScanSuccess);

}

/* restart */

function restartScanner(){

document.getElementById("result").style.display="none";
document.getElementById("scanAgain").style.display="none";

startScanner();

}

startScanner();

</script>

</body>
</html>
