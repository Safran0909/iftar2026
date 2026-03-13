const express = require("express");
const Razorpay = require("razorpay");
const cors = require("cors");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const { Pool } = require("pg");
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");

const app = express();

app.use(express.json());
app.use(cors());
app.use(express.static(__dirname));
/* -------------------------
   PostgreSQL
------------------------- */

const pool = new Pool({
connectionString:"postgresql://iftaruser:eS2WSyny9V9uM53uURVywjnKXbd9K1Nc@dpg-d6psquaa214c73ec0b00-a.oregon-postgres.render.com/d6iftar",
ssl:{rejectUnauthorized:false}
});

/* -------------------------
   Razorpay
------------------------- */

const razorpay = new Razorpay({
key_id:"rzp_live_SQduemo1jFIx6m",
key_secret:"vKIIZlJLqn8oQxtel02OorlC"
});

/* -------------------------
   Email
------------------------- */

const transporter = nodemailer.createTransport({
host: "smtp.gmail.com",
port: 587,
secure: false,
auth: {
user: "safrankankol@gmail.com",
pass: "uhaz dzqz sttb zfot"
}
});

transporter.verify(function(error, success) {
  if (error) {
    console.log("Email server error:", error);
  } else {
    console.log("Email server ready");
  }
});

/* -------------------------
   Create Payment Order
------------------------- */

app.post("/create-order",async(req,res)=>{

try{

const order = await razorpay.orders.create({
amount:100,
currency:"INR",
receipt:"receipt_"+Date.now()
});

res.json(order);

}catch(err){

console.log(err);
res.status(500).send("Order creation failed");

}

});

app.get("/test-email", async (req,res)=>{
try{
await transporter.sendMail({
from:"safrankankol@gmail.com",
to:"Safrankankol2@gmail.com",
subject:"Test Email",
text:"Email system working!"
});
res.send("Email sent");
}catch(err){
console.log(err);
res.send("Email failed");
}
});

/* -------------------------
   Register Attendee
------------------------- */

app.post("/register",async(req,res)=>{

const {name,email,phone} = req.body;

/* Validation */

if(!name || !email || !phone)
return res.status(400).send("Missing fields");

try{

const result = await pool.query(
"INSERT INTO attendees (name,email,phone) VALUES ($1,$2,$3) RETURNING id",
[name,email,phone]
);

const id = result.rows[0].id;

const ticket = "D6"+String(id).padStart(4,"0");

await pool.query(
"UPDATE attendees SET ticket_code=$1 WHERE id=$2",
[ticket,id]
);

/* QR Code */

const qrImage = await QRCode.toDataURL(ticket);
const base64Data = qrImage.replace(/^data:image\/png;base64,/,"");

/* IMPORTANT: send ticket to frontend immediately */

res.json({ticket});

/* Send email in background */

transporter.sendMail({

from:"safrankankol@gmail.com",
to:email,
subject:"Your Iftar Meet Ticket",

html:`
<h2>Iftar Meet Ticket</h2>

<p><b>Name:</b> ${name}</p>
<p><b>Email:</b> ${email}</p>
<p><b>Phone:</b> ${phone}</p>

<p><b>Ticket Code:</b> ${ticket}</p>

<p>Show this QR code at entry:</p>

<img src="cid:qrcode"/>
`,

attachments:[
{
filename:"qrcode.png",
content:base64Data,
encoding:"base64",
cid:"qrcode"
}
]

}).catch(err=>{
console.log("Email error:",err);
});

}catch(err){

console.log(err);
res.status(500).send("Registration failed");

}

});

/* -------------------------
   QR Check-in
------------------------- */

app.post("/checkin",async(req,res)=>{

const {ticket}=req.body;

try{

const result = await pool.query(
"SELECT * FROM attendees WHERE ticket_code=$1",
[ticket]
);

if(result.rows.length===0)
return res.send("Invalid Ticket");

const person=result.rows[0];

if(person.checked_in)
return res.send("Already Checked In");

await pool.query(
"UPDATE attendees SET checked_in=true WHERE ticket_code=$1",
[ticket]
);

res.send("Welcome "+person.name);

}catch(err){

console.log(err);
res.status(500).send("Scanner error");

}

});

/* -------------------------
   Live Dashboard Stats
------------------------- */

app.get("/stats",async(req,res)=>{

try{

const total = await pool.query(
"SELECT COUNT(*) FROM attendees"
);

const checked = await pool.query(
"SELECT COUNT(*) FROM attendees WHERE checked_in=true"
);

const totalCount = parseInt(total.rows[0].count);
const checkedCount = parseInt(checked.rows[0].count);

res.json({
total: totalCount,
checked: checkedCount,
remaining: totalCount - checkedCount
});

}catch(err){

console.log(err);
res.status(500).send("Stats error");

}

});

/* -------------------------
   Admin Attendee List
------------------------- */

app.get("/attendees",async(req,res)=>{

const result = await pool.query(
"SELECT * FROM attendees ORDER BY id DESC"
);

res.json(result.rows);

});

/* -------------------------
   Start Server
------------------------- */

const PORT = process.env.PORT || 5000;

app.listen(PORT,()=>{
console.log("Server running on port "+PORT);
});



