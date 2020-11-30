var mongoose=require("mongoose");

var campgroundSch = new mongoose.Schema({
	name: { type: String, required: [true,'Must Provide a Name']},
	price: { type: String, required: [true,'Must Provide a Price']},
	image: [{ url: String, Id: String}],
	description: { type: String, required: [true,'Must Provide a Description']},
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
		username: { type: String, required: [true,'Must Created By Valid User.']}
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
