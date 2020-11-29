var mongoose= require("mongoose");
var passportLocalMongoose = require("passport-local-mongoose");
var userSchema = new mongoose.Schema({
	username: {type: String, unique: true, required: true},
	password: String,
	image: String,
	imageId: String,
	firstName: String,
	lastName: String,
	description: String,
	email: {type: String, unique: true, required: true},
	notifications: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref:  'Notification' 
	}	
	],
	followers: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	],
	followings: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	],
	posts: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}
	],
	resetPasswordToken: String,
	resetPasswordExpires: Date,
	isAdmin: {type: Boolean, default: false}
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User",userSchema); 