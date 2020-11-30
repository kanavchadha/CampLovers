var express=require("express");
var router = express.Router();
var passport= require("passport");
var User = require("../models/user");
var campground = require("../models/campground");
var middleware = require("../middleware");
var async = require("async");
var Notification = require("../models/notification");
var nodemailer = require("nodemailer");
var crypto = require("crypto");
var multer = require("multer");
var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);  // this will create a name for our file, this include date stamp and its orignal name.
  }
});
var imageFilter = function (req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary');
cloudinary.config({ 
  cloud_name: 'dzzb5loan', 
  api_key: 313834315165587, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});


router.get("/",function(req,res){
	res.render("landPage");
});
// Authenticate routes.
router.get("/register",function(req,res){
	res.render("register");
});

router.post("/register",upload.single('image'),function(req,res){
	cloudinary.v2.uploader.upload(req.file.path, function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      // add cloudinary url for the image to the campground object under image property
      req.body.image = result.secure_url;
      // add image's public_id to campground object
      req.body.imageId = result.public_id;
	var newuser = new User({username: req.body.username,
							firstName: req.body.firstName,
						    lastName: req.body.lastName,
							email: req.body.email,
							image: req.body.image,
							imageId: req.body.imageId,
							description: req.body.description,
						   });
	// if(req.body.adminCode === 'ILoveMusicArijitSingh')
	// {
	// 	newuser.isAdmin = true;
	// }
	User.register(newuser,req.body.password,function(err,user){
		if(err)
		{
			req.flash("error",err.message);
			console.log(err);
			return res.redirect("/register");	
		}
		passport.authenticate("local")(req,res,function(){
			if(req.body.adminCode === 'ILoveMusicArijitSingh')
			{
			req.flash("success","Hello "+user.username+", Welcome to CampLovers (You are Admin!!)");
			}
			else{
			req.flash("success","Hello "+user.username+", Welcome to CampLovers");
			}
			res.redirect("/campage");
		});
	});
});
});

router.get("/login",function(req,res){
	res.render("login");
});
// app.post("/login",middleware,callback). here middleware will run :- passport.use(new localStrategy(User.authenticate()));  // uses userSchema.plugin().
router.post("/login",passport.authenticate("local",{
		successRedirect: "/campage",
		faliureRedirect: "/login"
	}),function(req,res){
	
});

router.get("/logout",function(req,res){
	req.logout();
	req.flash("success","Logout Successfully");
	res.redirect("/campage");
});

// User Profile
router.get("/users/:id",function(req,res){
	User.findById(req.params.id,function(err,foundUser){
		if(err){
			req.flash("error","Something went Wrong!");
			res.redirect("/campage");
		} 
		campground.find().where('author.id').equals(foundUser._id).exec(function(err,camps){
			if(err){
			req.flash("error","Something went Wrong!");
			res.redirect("/campage");
			}	
			res.render("user/show",{user: foundUser, campgrounds: camps});	
		});
	});
});

// User Profile Edit
router.get("/edituser/:id",middleware.isSame,async function(req,res){
	try{
		let user = await User.findById(req.params.id);
		res.render("editProfile",{fu: user});
	} catch(err) {
		 req.flash("error",err.message);
		res.redirect("back");
	}
});

router.put("/users/:id",middleware.isSame,upload.single('image'),function(req,res){
	User.findById(req.params.id,async function(err,Fuser){
		if(err){
			req.flash("error",err.message);
			res.redirect("back");
		} else {
			if(req.file){
				try{
					await cloudinary.v2.uploader.destroy(Fuser.imageId); // this allows us to finish this code first before going to next line.
					var result = await cloudinary.v2.uploader.upload(req.file.path);
					Fuser.imageId=result.public_id;
					Fuser.image=result.secure_url;
				} catch(err){
					req.flash("error",err.message);
					return res.redirect("back");
				}
			}
			Fuser.username = req.body.username;
			Fuser.firstName = req.body.firstName;
			Fuser.lastName = req.body.lastName;
			Fuser.email = req.body.email;
			Fuser.description = req.body.description;
			await Fuser.save();
			req.flash("success","Your Profile has Updated successfully.");
			res.redirect("/users/"+Fuser._id);
		}
	});
});

function escapeRegex(text)
{
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,"\\$&");
}



// Forgot Password
router.get("/forgot",function(req,res){
	res.render("forgot");
});

router.post("/forgot",function(req,res,next){
	async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');  // this token is the URL which is send to user's  email for password resetting 
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour i.e time after which that url expires.

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: process.env.GMAIL,
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: process.env.GMAIL,
        subject: 'Node.js Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'https://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err, 'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

router.get('/reset/:token', function(req, res) {
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: process.env.GMAIL,
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: process.env.GMAIL,
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campage');
  });
});

// search a user
router.get("/finduser",function(req,res){
	var noMatch=null;
	// console.log(req.query.searchuser);
	if(req.query.searchuser)
	{
		const regex = new RegExp(escapeRegex(req.query.searchuser),'gi');	
		User.find({username: regex},function(err,foundusers){
			if(err){
				res.redirect("back"); 
				req.flash("error",err.message);
			} else{
			if(foundusers.length <= 0){
				noMatch="Sorry, No user has found with Name: "+ req.query.searchuser;
				res.render("usersList",{noMatch: noMatch, users: foundusers});
			} else{
				res.render("usersList",{noMatch: noMatch, users: foundusers}); // req.user contains the id and username of the registered user.
				}
			}
		});
	} else{
		res.render("usersList",{noMatch: noMatch, users: null});
	}
		
	// else{
	// 	req.flash("error","Please Provide a valid input!");
	// 	return res.redirect("/back");
	// }   
});
		
// AutoComplete Suggestion
router.get("/autocomplete/",function(req,res){
	var patt = new RegExp(escapeRegex(req.query.searchuser),'gi');
	var suggestUser = User.find({username: patt},{'username': 1}).sort({"updated_at": -1}).sort({"created_at": -1}).limit(20);
	suggestUser.exec(function(err,data){
		var result=[];
		if(!err){
			if(data && data.length && data.length > 0){
				data.forEach(function(su){
					let obj = {
						id: su._id,
						label: su.username
					};
					result.push(obj);
				});
			}
			// console.log(data);
			res.jsonp(result);
		}
		else{
			console.log(err);
		}
	})
});

// followers
router.get("/follow/:id",middleware.isLoggedIn,async function(req,res){
	try{
		let user = await User.findById(req.params.id);	
		user.followers.push(req.user._id);
		user.save();
		let userf = await User.findById(req.user._id).populate('followings').exec();
		userf.followings.push(req.params.id);
		userf.save();
		req.flash('success','Successfully followed '+user.username);
		res.redirect("/users/"+req.params.id);
	} catch(err){
		req.flash('error',err.message);
		res.redirect("back");
	}
});
// notifications
router.get("/notifications",middleware.isLoggedIn,async function(req,res){
	try{
		let user = await User.findById(req.user._id).populate({
		path: 'notifications',
		options: {sort: {"_id": -1} } // sort in descending order.
	}).exec();
	let allNotifications = user.notifications; // array
		res.render("notifications/index",{allNotifications});
	} catch(err){
		req.flash('error',err.message);
		res.redirect("back");
	}
});
// Handle Notifications
router.get("/notifications/:id",middleware.isLoggedIn,async function(req,res){
	try{
		let notification = await Notification.findById(req.params.id);
		notification.isRead = true;
		notification.save();
		res.redirect("/campage/"+notification.campgroundId);
	} catch(err){
		req.flash('error',err.message);
		res.redirect("back");
	}
});

// Followers
router.get("/followers/:id",middleware.isLoggedIn,async function(req,res){
	try{
	let user = await User.findById(req.params.id);
	let arr = [];	
	for(const foll of user.followers){	
		let fu = await User.findById(foll);
		arr.push(fu);
	};
	res.render("user/followers",{follArr: arr});
	} catch(err)
	  {
		  req.flash('error',err.message);
		  res.redirect("back");
	  }
});

// Followings
router.get("/followings/:id",middleware.isLoggedIn,async function(req,res){
	try{
	let user = await User.findById(req.params.id);
	let arr = [];	
	for(const foll of user.followings){	
		let fu = await User.findById(foll);
		arr.push(fu);
	}
	res.render("user/followings",{follArr: arr});
	} catch(err)
	  {
		  req.flash('error',err.message);
		  res.redirect("back");
	  }
});

// Unfollow
router.get("/unfollow/:id",middleware.isLoggedIn,async function(req,res){
	try{
		let user = await User.findById(req.params.id);
		let ufuser = await User.findById(req.user._id);
		for(var i=0; i < user.followers.length; i++)
		{
			if(user.followers[i] == req.user.id)
			{
				// console.log("inside the followers if block");
				user.followers.splice(i,1);
				break;
			}	
		}
		user.save();
		for(var i=0; i < ufuser.followers.length; i++)
		{
			if(ufuser.followings[i] == req.params.id)
			{
				console.log("inside the followings if block");
				ufuser.followings.splice(i,1);
				break;
			}	
		}
		ufuser.save();
		res.redirect("/users/"+req.params.id);
	} catch(err){
		req.flash('error',err.message);
		res.redirect("back");
		}
});


function isLoggedIn(req,res,next)
{
	if(req.isAuthenticated())
	{
		return next();
	}
	res.redirect("/login");
}

module.exports = router;