let express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const shortid = require('shortid')
dotenv.config();
let app = express();
app.use( express.static( "public" ) );

let conn = false;
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://admin:vimal@cluster0.nppm5.mongodb.net/order', {useNewUrlParser: true, useUnifiedTopology: true,useCreateIndex: true,
})
.then(() => {
  console.log("Database connected!")
  conn = true;
})
.catch((err) => {
  console.log(`DB Connection Error: ${err.message}`);
});

// our data schemas
const orderSchema={
  time:String,
  user:{
    trackId:String,
    razorpay_order_id:String,
    razorpay_payment_id:String,
    razorpay_signature:String,
    payment_status:String
  },
  order:[],
  package:[],
  amount:String,
  status:{type: String, default: 'Order Pending'},
}

const Order = mongoose.model("Order",orderSchema);

const placedSchema = {order:[]}
const Placed = mongoose.model("Placed",placedSchema);


const razorpay = new Razorpay({
	key_id: 'rzp_test_nuKJ2WIeaaMeEr',
	key_secret: 'oDqxNMo9mQ1S6JLE9f0JGGm0'
})

// this function will calculte the price of the item according to its weight

function amount_calc(package_det){
  let data={
    "12":{
      "1kg":{"5km":"60","10km":"65","15km":"70","20km":"80","30km":"85","40km":"90","50km":"95"},
      "5kg":{"5km":"65","10km":"69","15km":"80","20km":"90","30km":"110","40km":"120","50km":"130"},
      "10kg":{"5km":"95","10km":"120","15km":"140","20km":"160","30km":"170","40km":"180","50km":"190"},
      "20kg":{"5km":"120","10km":"135","15km":"165","20km":"175","30km":"185","40km":"189","50km":"199"},
      "25kg":{"5km":"125","10km":"160","15km":"189","20km":"195","30km":"210","40km":"220","50km":"230"},
      "30kg":{"5km":"140","10km":"175","15km":"200","20km":"215","30km":"230","40km":"235","50km":"240"}
    },
    "24":{
      "1kg":{"60km":"100"},
      "5kg":{"60km":"125"},
      "10kg":{"60km":"195"},
      "20kg":{"60km":"265"},
      "25kg":{"60km":"280"},
      "30kg":{"60km":"290"}
    }
  }

  return data[package_det.delivery][package_det.weight][package_det.distance];
}

// let order_details={}
// let package_det=""
// let amount
//Middlewares
app.use(cors());
app.use(express.json());
app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());
app.set("view engine", "ejs");

//Routes
app.get("/", (req, res) => {
  if(conn){
    return res.render("home");
  }
  res.render("error",{message:"database not connected check your internet connection"});
});

app.get("/checkout", (req, res) => {
  res.render("checkout");
});
app.get("/privacy", (req, res) => {
  res.render("privacy");
});
app.get("/refund",(req,res)=>{
  res.render("refund");
})
app.get("/track", (req, res) => {
  res.render("track");
});
app.get("/aboutus", (req, res) => {
  res.render("about");
});
app.get("/termandcondition", (req, res) => {
  res.render("termandcondition");
});
app.get("/contactus", (req, res) => {
  res.render("contactus");
});

app.post('/track',async (req,res)=>{
  const trackid=req.body.track;
  try {
    Order.find({'user.trackId':trackid},function(err, data){
      if(err){return res.send(err)}
      if(data.length==0){
        return res.render("error",{message:"No Order From This Tracking ID"});
      }
      return res.render('track',{data:data})
    });
  } catch (error) {
    return res.send(JSON.stringify(error))
  }
})



app.post('/order1',(req,res)=>{
  console.log(req.body)
  package_det={
    distance:req.body.distance1,
    weight:req.body.weight1,
    delivery:req.body.del_time
  }
  const amount=amount_calc(package_det)
  try {
    const order  = new Order();
    let d = new Date();
    let now = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true});
    order.time=now;
    order.package.push(package_det);
    order.amount=amount;
    order.save(function(err, obj) {
      if(err){throw err}
      console.log(obj._id);
      return res.render('order',{amount:amount,id:obj._id})
    });
  } catch (error) {
    console.log(error);
    res.render('error',{message:"some error occoured"})
  }
  // res.render('order',{amount:amount,id:})
})

app.post('/order2',(req,res)=>{
  console.log(req.body)
  package_det={
    distance:req.body.distance2,
    weight:req.body.weight2,
    delivery:req.body.del_time
  }
  const amount=amount_calc(package_det)
  try {
    const order  = new Order();
    let d = new Date();
    let now = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true});
    order.time=now;
    order.package.push(package_det);
    order.amount=amount;
    order.save(function(err, obj) {
      if(err){throw err}
      console.log(obj._id);
      return res.render('order',{amount:amount,id:obj._id})
    });
  } catch (error) {
    console.log(error);
    res.render('error',{message:"some error occoured"})
  }
})

// getting order details from user
app.post('/pay',async (req,res)=>{
  console.log(req.body);
  order_details={
    s_name: req.body.s_name,
    s_pno: req.body.s_pno,
    s_email: req.body.s_email,
    s_pin: req.body.s_pin,
    s_address: req.body.s_address,
    r_name: req.body.r_name,
    r_pno: req.body.r_pno,
    r_pin: req.body.r_pin,
    r_address: req.body.r_address,
  }
  try {
    let d = new Date();
    let now = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true});
    let order = await Order.find({_id:req.body.id});
    order=order[0];
    console.log(order)
    order.time=now;
    order.order.push(order_details);
    order.save(function(err, obj) {
      if(err){throw err}
      console.log(obj._id);
      return res.render('pay',{amount:obj.amount,weight:order.package[0].weight,distance:order.package[0].distance,order_details:order_details,id:obj._id})
    });
  } catch (error) {
    console.log(error);
    res.render('error',{message:"some error occoured"})
  }
  
})


// payment
app.post('/razorpay', async (req, res) => {

	try {
    let order = await Order.find({_id:req.body.id});
    order=order[0];
    const payment_capture = 1
    const currency = 'INR'
    const options = {
      amount: order.amount * 100,
      currency,
      receipt: shortid.generate(),
      payment_capture
    }
		const response = await razorpay.orders.create(options)
    // 
    order.user.trackId=response.id;
    let d = new Date();          
    let now = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true});
    order.time=now;
    if(req.body.cod==true){
      order.status="Order placed Successfully";
      order.user.payment_status="cash on delivery";
      const placed = new Placed();
      placed.order.push(order);
      placed.save((err)=>{if(err){throw err;}else{console.log("data saved")}});
    }
    order.save((err)=>{if(err){throw err;}else{console.log("data saved in rz")}});
    // 
		console.log(response)
		res.json({
			id: response.id,
			currency: response.currency,
			amount: response.amount
		})
	} catch (error) {
    console.log(error)
		res.json({status:"error"})
	}
})



// verifying the payment
app.post("/api/payment/verify",async (req, res) => {
	console.log(req.body)
	console.log(req.body.razorpay_order_id)
	body = req.body.razorpay_order_id + "|" + req.body.razorpay_payment_id;
	var expectedSignature = crypto
	  .createHmac("sha256", 'oDqxNMo9mQ1S6JLE9f0JGGm0')
	  .update(body.toString())
	  .digest("hex");
	console.log("sig" + req.body.razorpay_signature);
	console.log("sig" + expectedSignature);
	let response = { status: "failure" };
	if (expectedSignature === req.body.razorpay_signature){
    response = { status: "success" };
    try {
      let order = await Order.find({_id:req.body.id});
      order=order[0];
      order.user.trackId=req.body.razorpay_order_id;
      order.user.razorpay_order_id=req.body.razorpay_order_id;
      order.user.razorpay_payment_id=req.body.razorpay_payment_id;
      order.user.razorpay_signature=req.body.razorpay_signature;
      order.user.payment_status="success";
      let d = new Date();          
      let now = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata', hour12: true});
      order.time=now;
      order.status="Order placed Successfully";
      order.save((err)=>{if(err){throw err;}else{console.log("data saved")}});
      const placed = new Placed();
      placed.order.push(order);
      placed.save((err)=>{if(err){throw err;}else{console.log("data saved")}});
    } catch (error) {
      console.log(error)
      return res.send({status:"error"});
    }
  }
	res.send(response);
});













app.listen("3000", () => {
  console.log("server started");
});




// git reset --hard origin/main