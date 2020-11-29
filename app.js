require('dotenv').config();

var express =require("express");
var app = express();
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var flash = require("connect-flash");
var passport = require("passport");
var localStrategy = require("passport-local");
var methodOverride = require("method-override");
var $ = require("jquery");
var async = require("async");
var campground = require("./models/campground"); // using schema model from campground.js file, this is called importing a file.
var Comment = require("./models/comments");
var User = require("./models/user");
var seedDB =require("./seeds");

var campRoutes=require("./routes/campgrounds");
var commentsRoutes=require("./routes/comments");
var authRoutes=require("./routes/authentication");
var reviewRoutes=require("./routes/review");

// var url=process.env.DATABASEURL || "mongodb://localhost:27017/yelp_camp_v7";
// mongoose.connect(url,{useNewUrlParser: true});

mongoose.connect(process.env.MONGODB_URI, { // must enter Hex code at password field. 
	useNewUrlParser: true,
	useCreateIndex: true}).then(()=> {
	console.log("Connected to DB");
}).catch(err => {
	console.log("Error",err.message);
}) ;	//extra stuff is just to avoid warnings.

app.locals.moment= require("moment");

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine","ejs");
app.use(express.static(__dirname+"/public"));
app.use(methodOverride("_method"));
app.use(flash());
// seedDB(); // seeding the database.

app.use(require("express-session")({
	secret: "this bla bla bla secret!",
	resave: false,
	saveUninitialized: false
}));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new localStrategy(User.authenticate()));  // uses userSchema.plugin().
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.use(async function(req,res,next){  // middleware which is running on every routes 
	res.locals.currUser = req.user;// whatever we put in res.locals is what's inside our all templates.
	if(req.user){
		try{
			let user = await User.findById(req.user._id).populate('notifications',null,{isRead: false}).exec(); // connect notifications with each user.
			res.locals.notifications = user.notifications.reverse();// we arrange them in descending order. 
		} catch(err){
			console.log(err.message);
		}
	}
	res.locals.error = req.flash("error");
	res.locals.success = req.flash("success");
	next();
});

app.use(authRoutes);  
app.use(campRoutes);// we can also add here the route which is common in all routes like app.use("/campgrounds",campRoute)  
app.use(commentsRoutes);
app.use("/campage/:id/reviews",reviewRoutes);
app.get("/about",function(req,res){
	res.render("about");		
});
// console.log(__dirname);
app.listen(process.env.PORT||3000,process.env.IP,function(){
	console.log("Server has started..");
});
