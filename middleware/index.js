// Must named as index.js
var campground = require("../models/campground");
var Comment = require("../models/comments");
var Review = require("../models/review");
var User = require("../models/user");
var middlewareObj={};

middlewareObj.Authorization = function(req,res,next){
	if(req.isAuthenticated())
	{
		campground.findById(req.params.id,function(err,Fcampground){
			if(err){
				req.flash("error","Something went wrong!");
				console.log(err);
				res.redirect("back");
			} else if(!Fcampground){
				req.flash("error","Campground Not Found!");
				res.redirect("back");
			} else{
				if(Fcampground.author.id.equals(req.user._id) || req.user.isAdmin)  // Authorization.
				{
					next();
				} else{
					req.flash("error","You Don't have Permission to that!");
					res.redirect("back");
				}
			}
		});
	} else{
		req.flash("error","You need to be Login to do that!");
		res.redirect("/login");
	}
}
middlewareObj.comAuthorization=function(req,res,next)
{
	if(req.isAuthenticated())
	{
		Comment.findById(req.params.cid,function(err,Fcomment){
			if(err){
				req.flash("error","Something went wrong!");
				console.log(err);
				res.redirect("back");
			} else if(!Fcomment){
				req.flash("error","Comment Not Found!");
				res.redirect("back");
			} else{
				if(Fcomment.author.id.equals(req.user._id) || req.user.isAdmin)  // Authorization.
				{
					next();
 				} else{
					req.flash("error","You Don't have permission to that!");
					res.redirect("back");
				}
			}
		});	
	} else{
		req.flash("error","You need to be Login to that!");
		res.redirect("/login");
	}
}

middlewareObj.isLoggedIn=function(req,res,next)
{
	if(req.isAuthenticated())
	{
		return next();
	}
	req.flash("error","Please Login first to do that!"); //(key,msg)
	res.redirect("/login");
}
middlewareObj.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
				req.flash("error","Review Not Found!");
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("/login");
    }
};

middlewareObj.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/campgrounds/" + foundCampground._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("/login");
    }
};

middlewareObj.isSame = function(req,res,next){
	if (req.isAuthenticated()) {
		User.findById(req.params.id,function(err,fuser){
			if(err)
			{
				req.flash("error",err.message);
				res.redirect("back");
			}
			if(fuser._id.equals(req.user._id)){
				next();
			} else {
				req.flash("error","You are not Allowed to do that!");
				res.redirect("back");
			}
		});
	}
	else{
		req.flash("error","You need to be Login to that!");
		res.redirect("/login");
	}
}

module.exports= middlewareObj;