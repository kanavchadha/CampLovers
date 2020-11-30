var express = require("express");
var router = express.Router(); // way of exporting routes.
var campground = require("../models/campground");
var User = require("../models/user");
var Review = require("../models/review");
var Comment = require("../models/comments");
var middleware = require("../middleware");
var Notification = require("../models/notification");
var multer = require("multer");
var mapboxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");

const geocoder = mapboxGeocoding({accessToken: process.env.MAPBOX_TOKEN});

const { storage } = require('../cloudinary');
const { cloudinary } = require("../cloudinary");

const upload = multer({ storage });



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

router.post("/campage",middleware.isLoggedIn,upload.array('image'),async function(req,res){
	try{
		
		req.body.campground.image = req.files.map(f => ({ url: f.path, Id: f.filename }));
		
		req.body.campground.author = {
			id: req.user._id,
			username: req.user.username
		} 
		
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

// EDIT POST
router.get("/campage/:id/edit",middleware.Authorization,function(req,res){
		campground.findById(req.params.id,function(err,Fcampground){
			res.render("campgrounds/edit",{editcamp: Fcampground});
		});	
});

router.put("/campage/:id",middleware.Authorization,upload.array('image'),async function(req,res){
	try{
		const fCampground = await campground.findById(req.params.id);
		const imgs = req.files.map(f => ({ url: f.path, Id: f.filename }));
		fCampground.image.push(...imgs);
		if (req.body.deleteImages) {
			for (let Id of req.body.deleteImages) {
				await cloudinary.uploader.destroy(Id);
			}
			await fCampground.updateOne({ $pull: { image: { Id: { $in: req.body.deleteImages } } } });
		}
			
		const geoData = await geocoder.forwardGeocode({
		   query: req.body.location,
		   limit: 1
		}).send();
		
		fCampground.name = req.body.name;
		fCampground.price = req.body.price;
		fCampground.description = req.body.description;
		fCampground.location = req.body.location;
		fCampground.geometry = geoData.body.features[0].geometry;
		
		await fCampground.save();
		
		req.flash("success","your Post has been updated Successfully");
		res.redirect("/campage/"+fCampground._id);	
	}catch(err){
		req.flash("error",err.message);
		res.redirect("back");
	}
});

// DELETE post
router.delete('/campage/:id',middleware.Authorization, function(req, res) {
  campground.findById(req.params.id, async function(err, campground) {
    if(err) {
      req.flash("error", err.message);
      return res.redirect("back");
    }
    try {
		for (let img of campground.image) {
			await cloudinary.uploader.destroy(img.Id);
		}
		// deletes all reviews associated with the campground
        await Review.remove({"_id": {$in: campground.reviews}});
		// deletes all comments associated with the campground
        await Comment.remove({"_id": {$in: campground.reviews}});
        // Removing from user's posts list.
		const user = await User.findById(req.user._id);
		user.posts.pull(campground._id);
		await user.save();
		
		await campground.remove();
		req.flash('success', 'Campground deleted successfully!');
		res.redirect('/campage');
    } catch(err) {
      	req.flash("error", err.message);
        return res.redirect("/campage");
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