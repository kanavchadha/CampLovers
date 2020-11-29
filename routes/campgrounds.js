var express = require("express");
var router = express.Router(); // way of exporting routes.
var campground = require("../models/campground");
var User = require("../models/user");
var Review = require("../models/review");
var middleware = require("../middleware");
var Notification = require("../models/notification");
var multer = require("multer");
var mapboxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const geocoder = mapboxGeocoding({accessToken: process.env.MAPBOX_TOKEN});

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


router.get("/campage",function(req,res){
	var noMatch=null;
	if(req.query.search)
	{
		const regex = new RegExp(escapeRegex(req.query.search),'gi');
		campground.find({name: regex},function(err,allcamps){
		if(err){
			console.log("Something went wrong!!"+err);
		} else{
			if(allcamps.length <= 0){
				noMatch="Sorry, No Campgrounds with Name: '"+ req.query.search +"' have found";
				res.render("campgrounds/camping",{cmp: allcamps, noMatch: noMatch});
			} else{
			res.render("campgrounds/camping",{cmp: allcamps, noMatch: noMatch}); // req.user contains the id and username of the registered user.
			}
		}
		});
	} else{
		campground.find({},function(err,allcamps){
		if(err){
			console.log("Something went wrong!!"+err);
		} else{
			res.render("campgrounds/camping",{cmp: allcamps, noMatch: noMatch}); // req.user contains the id and username of the registered user.
		}
		});
	}
});

router.get("/campage/new",middleware.isLoggedIn,function(req,res){
	res.render("campgrounds/new");
});

router.get("/campage/:id",function(req,res){
	campground.findById(req.params.id).populate("comments likes").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}} // we can also do chaining of populate.
    }).exec(function(err,currCG){ // connecting comments, likes and review to campground.
		if(err){
			console.log("Something went wrong!!"+err);
		} else {
			res.render("campgrounds/infoCG",{cg: currCG});	
		}
	});
});

router.post("/campage",middleware.isLoggedIn,upload.single('image'),function(req,res){
  // .file.path is from multer and result object is from cloudinary, and this have onee secure URL which we have to strore in our Database.
   cloudinary.v2.uploader.upload(req.file.path, async function(err, result) {
      if(err) {
        req.flash('error', err.message);
        return res.redirect('back');
      }
      req.body.campground.image = result.secure_url;
      req.body.campground.imageId = result.public_id;
      req.body.campground.author = {
        id: req.user._id,
        username: req.user.username
      } 
	  try{  
	    const geoData = await geocoder.forwardGeocode({
		   query: req.body.campground.location,
		   limit: 1
	    }).send();
		  
		let Campground = await new campground(req.body.campground);
		Campground.geometry = geoData.body.features[0].geometry;
		await Campground.save(); 
		let user = await User.findById(req.user._id).populate('followers').exec();
		let newNotification = {
			username: req.user.username,
			campgroundId: Campground.id
		} 
		for(const followers of user.followers){
			let notification = await Notification.create(newNotification);
			followers.notifications.push(notification); 
			followers.save();
		}
		let posts = await User.findById(req.user._id).populate('posts').exec();
		user.posts.push(Campground.id);
		user.save();  
		res.redirect('/campage/' + Campground.id);	
	  } catch(err){
		  req.flash('error',err.message);
		  res.redirect('back');
	  }
    });
});

// Likes Button
router.post("/campage/:id/like", middleware.isLoggedIn,function (req, res){
    campground.findById(req.params.id, function (err, foundCampground) {
        if (err) {
            console.log(err);
            return res.redirect("/campage");
        }

        // check if req.user._id exists in foundCampground.likes
        var foundUserLike = foundCampground.likes.some(function (like) {
            return like.equals(req.user._id);
        });

        if (foundUserLike) {
            // user already liked, removing like
            foundCampground.likes.pull(req.user._id);
        } else {
            // adding the new user like
            foundCampground.likes.push(req.user);
        }

        foundCampground.save(function (err) {
            if (err) {
                console.log(err);
                return res.redirect("/campage");
            }
            return res.redirect("/campage/" + foundCampground._id);
        });
    });
});


// EDIT POST
router.get("/campage/:id/edit",middleware.Authorization,function(req,res){
		campground.findById(req.params.id,function(err,Fcampground){
			res.render("campgrounds/edit",{editcamp: Fcampground});
		});	
});

router.put("/campage/:id",middleware.Authorization,upload.single('image'),function(req,res){
	campground.findById(req.params.id,async function(err,campground){
		if(err){
			req.flash("error",err.message);
			return res.redirect("back");
		}
		
		if(req.file){
			try{ // this is important for await (async).
			    await cloudinary.v2.uploader.destroy(campground.imageId); 
				// this allows us to finish this code first before going to next line.
			    var result = await cloudinary.v2.uploader.upload(req.file.path);
				campground.imageId=result.public_id;
				campground.image=result.secure_url;
			} catch(err){
				req.flash("error",err.message);
				res.redirect("back");
			}
		}
			
		const geoData = await geocoder.forwardGeocode({
		   query: req.body.location,
		   limit: 1
		}).send();
		
		campground.name = req.body.name;
		campground.price = req.body.price;
		campground.description = req.body.description;
		campground.location = req.body.location;
		campground.geometry = geoData.body.features[0].geometry;
		
		await campground.save();
		
		req.flash("success","your Post is Updated successfully");
		res.redirect("/campage/"+campground._id);
	});
});

// DELETE post
router.delete('/campage/:id',middleware.Authorization, function(req, res) {
  campground.findById(req.params.id, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
        await cloudinary.v2.uploader.destroy(campground.imageId);
		 // deletes all reviews associated with the campground
         Review.remove({"_id": {$in: campground.reviews}}, function (err) {
            if (err) {
         	    console.log(err);
            	return res.redirect("/campage");
             }
        campground.remove();
        req.flash('success', 'Campground deleted successfully!');
        res.redirect('/campage');
		 });	 
    } catch(err) {
        if(err) {
          req.flash("error", err.message);
          return res.redirect("back");
        }
    }
  });
});

// views 
router.post("/views/:id",function(req,res){
	campground.findById(req.params.id,function(err,vc){
		if(err){
			req.flash("error",err.message);
			return res.redirect("back");
		}
		vc.views=vc.views+1;
		vc.save();
		// console.log("viewed a campground");
		res.redirect("/campage/"+vc._id);
	});
});

// campgrounds geojson data for cluster map
router.get("/campgrounds/geojson-data",async (req,res)=>{
	try{
		const allcamps = await campground.find({},'name location geometry');
		const features = allcamps.map(cg => ({
			geometry: cg.geometry,
			properties: { name: cg.name, location: cg.location, id: cg._id }
		}));
		res.send({features: features});
	} catch(err){
		res.status(500).send({error: err.message});
	}
	
})

function escapeRegex(text)
{
	return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g,"\\$&");
}
module.exports = router;