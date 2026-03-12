const express = require("express");
const Razorpay = require("razorpay");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const nodemailer = require("nodemailer");
const QRCode = require("qrcode");

const app = express();

app.use(bodyParser.json());
app.use(cors());
app.use(express.static(__dirname));

/* -------------------------
   Razorpay Setup
------------------------- */

const razorpay = new Razorpay({
  key_id: "rzp_live_SQRDi41FeZ7Myg",
  key_secret: "zTWm9iM4CozUw6VAkC8WC3yn"
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
   Attendee Storage
------------------------- */

let attendees = [];
let ticketCounter = 1;

/* -------------------------
   Generate Ticket Code
------------------------- */

function generateTicket() {

  const ticket = "D6" + String(ticketCounter).padStart(4, "0");
  ticketCounter++;

  return ticket;

}

/* -------------------------
   Create Razorpay Order
------------------------- */

app.post("/create-order", async (req, res) => {

  const options = {
    amount: 100, // ₹50 example
    currency: "INR",
    receipt: "receipt_" + Date.now()
  };

  try {

    const order = await razorpay.orders.create(options);

    res.json(order);

  } catch (err) {

    res.status(500).send(err);

  }

});

/* -------------------------
   Register Attendee
------------------------- */
    app.post("/register", async (req, res) => {

  const { name, email, phone } = req.body;

  const ticket = generateTicket();

  const person = {
    name,
    email,
    phone,
    ticket,
    checkedIn: false
  };

  attendees.push(person);

  try {

    const qrImage = await QRCode.toDataURL(ticket);
    const base64Data = qrImage.replace(/^data:image\/png;base64,/, "");

    const mailOptions = {
      from: "yourgmail@gmail.com",
      to: email,
      subject: "Your Iftar Meet Ticket",
      html: `
        <h2>Iftar Meet Ticket</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Phone:</b> ${phone}</p>
        <p><b>Ticket Code:</b> ${ticket}</p>
        <p>Show this QR code at entry:</p>
        <img src="cid:qrcode"/>
      `,
      attachments: [
        {
          filename: "qrcode.png",
          content: base64Data,
          encoding: "base64",
          cid: "qrcode"
        }
      ]
    };

    await transporter.sendMail(mailOptions);

  } catch (err) {
    console.log(err);
  }

  res.json({ ticket });

});

/* -------------------------
   QR Check-in Endpoint
------------------------- */

app.post("/checkin", (req, res) => {

  const ticket = req.body.ticket;

  const person = attendees.find(a => a.ticket === ticket);

  if (person) {

    if (person.checkedIn) {

      res.send("Already Checked In");

    } else {

      person.checkedIn = true;
      res.send("Welcome " + person.name);

    }

  } else {

    res.send("Invalid Ticket");

  }

});

/* -------------------------
   Admin View
------------------------- */

app.get("/attendees", (req, res) => {

  res.json(attendees);

});

/* -------------------------
   Start Server
------------------------- */

app.listen(5000, () => {

  console.log("Server running on http://localhost:5000");

});