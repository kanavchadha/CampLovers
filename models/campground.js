var mongoose=require("mongoose");

var campgroundSch = new mongoose.Schema({
	name: String,
	price: String,
	image: String,
	imageId: String,
	description: String,
	views: {
		type: Number,
		default: 0
	},
	createdAt: { type: Date, default: Date.now},
	author: {
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: "User"
		},
		username: String
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: "comment"
		}
	],
	likes: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        }
    ],
	reviews: [
        {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Review"
        }
    ],
    rating: {
        type: Number,
        default: 0
    },
	location: { type: String, default: 'Manali,India',required: [true,'Must Provide a Location']},
	geometry: {
		type: {type: String, enum: ['Point']},
		coordinates: {type: [Number]}
	}
});
module.exports = mongoose.model("campground",campgroundSch); // for exporting this file to some other file.
