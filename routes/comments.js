var express = require("express");
var router = express.Router(); // way of exporting routes.
var campground = require("../models/campground");
var Comment = require("../models/comments");
var middleware = require("../middleware");
// 	COMMENTS
router.get("/campage/:id/comments/new",middleware.isLoggedIn,function(req,res){
	campground.findById(req.params.id,function(err,campc){
		if(err){
			console.log(err);
		} else{
			res.render("comments/new",{c: campc});
		}
	});
});

router.post("/campage/:id/comments",middleware.isLoggedIn,function(req,res){
	campground.findById(req.params.id,function(err,campg){
	if(err){
		console.log(err);
		res.redirect("/campage");
	} else{
		Comment.create(req.body.comment,function(err,com){
			if(err){
			req.flash("error","Something went to be wrong!");
			console.log(err);
		} else {
			com.author.id=req.user._id;
			com.author.username=req.user.username;
			com.save();
			campg.comments.push(com);
			campg.save();
			res.redirect("/campage/"+campg._id);
		} 
		});	
	}
		
	});
});

router.get("/campage/:id/comments/:cid/edit",middleware.comAuthorization,function(req,res){
	var cmg = req.params.id;
	Comment.findById(req.params.cid,function(err,foundCom){
		if(err)
		{
			console.log(err);
			res.redirect("back");
		} else{
			res.render("comments/edit",{c: cmg,comment: foundCom});
		}
	});
});

router.put("/campage/:id/comments/:cid",middleware.comAuthorization,function(req,res){
	Comment.findByIdAndUpdate(req.params.cid,req.body.comment,function(err,updateCom){
		if(err)
		{
			console.log(err);
			res.redirect("back");
		} else{
			req.flash("success","your review is Updated successfully");
			res.redirect("/campage/"+req.params.id);
		}
	});
});

router.delete("/campage/:id/comments/:cid",middleware.comAuthorization,function(req,res){
	Comment.findByIdAndDelete(req.params.cid,function(err){
		if(err){
			res.redirect("back");
		} else{
			req.flash("success","your review is removed successfully");
			res.redirect("/campage/"+req.params.id);
		}
	});
});

module.exports = router;