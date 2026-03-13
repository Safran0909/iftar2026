const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const cors = require("cors");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");
const { Pool } = require("pg");

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));

/* -------------------------
   PostgreSQL Connection
------------------------- */

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || "postgresql://iftaruser:eS2WSyny9V9uM53uURVywjnKXbd9K1Nc@dpg-d6psquaa214c73ec0b00-a.oregon-postgres.render.com/d6iftar",
  ssl: { rejectUnauthorized: false }
});

/* -------------------------
   Razorpay Setup
------------------------- */

const razorpay = new Razorpay({
  key_id: "rzp_live_SQduemo1jFIx6m",
  key_secret: "vKIIZlJLqn8oQxtel02OorlC"
});

/* -------------------------
   Email Setup
------------------------- */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "safrankankol@gmail.com",
    pass: "uhaz dzqz sttb zfot"
  }
});

/* -------------------------
   Create Payment Order
------------------------- */

app.post("/create-order", async (req,res)=>{

  try{

    const order = await razorpay.orders.create({
      amount: 100, // ₹1
      currency: "INR",
      receipt: "receipt_" + Date.now()
    });

    res.json(order);

  }catch(err){

    console.log(err);
    res.status(500).send("Order creation failed");

  }

});

/* -------------------------
   Register Attendee
------------------------- */

app.post("/register", async (req,res)=>{

const { name,email,phone } = req.body;

try{

const result = await pool.query(
"INSERT INTO attendees (name,email,phone) VALUES ($1,$2,$3) RETURNING id",
[name,email,phone]
);

const id = result.rows[0].id;

const ticket = "D6" + String(id).padStart(4,"0");

await pool.query(
"UPDATE attendees SET ticket_code=$1 WHERE id=$2",
[ticket,id]
);

/* QR CODE */

const qrImage = await QRCode.toDataURL(ticket);
const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");

/* EMAIL */

await transporter.sendMail({

from:"YOUR_EMAIL@gmail.com",
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

});

res.json({ticket});

}catch(err){

console.log(err);
res.status(500).send("Registration failed");

}

});

/* -------------------------
   QR Check-in
------------------------- */

app.post("/checkin", async (req,res)=>{

const { ticket } = req.body;

try{

const result = await pool.query(
"SELECT * FROM attendees WHERE ticket_code=$1",
[ticket]
);

if(result.rows.length===0){
return res.send("Invalid Ticket");
}

const person = result.rows[0];

if(person.checked_in){
return res.send("Already Checked In");
}

await pool.query(
"UPDATE attendees SET checked_in=true WHERE ticket_code=$1",
[ticket]
);

res.send("Welcome " + person.name);

}catch(err){

console.log(err);
res.status(500).send("Scanner error");

}

});

/* -------------------------
   Admin list
------------------------- */

app.get("/attendees", async (req,res)=>{

const result = await pool.query(
"SELECT * FROM attendees ORDER BY id DESC"
);

res.json(result.rows);

});

/* -------------------------
   Start Server
------------------------- */

app.listen(5000,()=>{
console.log("Server running on http://localhost:5000");
});
