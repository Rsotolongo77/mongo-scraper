// Dependencies
var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var methodOverride = require("method-override");
var Note = require("./models/Note.js");
var Article = require("./models/Article.js");


//Scraping tools
var request = require("request");
var cheerio = require("cheerio");

// Initialize Express
var app = express();
var PORT = process.env.PORT || 3000;

// Use body parser
app.use(bodyParser.urlencoded({
    extended: false
}));

// override with POST 
app.use(methodOverride('_method'));

//Public a static dir
app.use(express.static("./public"));

//Set Handlebars.
var exphbs = require("express-handlebars");
app.set('views', __dirname + '/views');
app.engine("handlebars", exphbs({ defaultLayout: "main", layoutsDir: __dirname + "/views/layouts" }));
app.set("view engine", "handlebars");

// Database configuration with mongoose
mongoose.Promise = Promise;
var databaseUri = "mongodb://localhost/mongo-scraper";
if (process.env.MONGODB_URI) {
    mongoose.connect(process.env.MONGODB_URI);
} else {
    mongoose.connect(databaseUri);
}
var db = mongoose.connection;

db.on("error", function (error) {
    console.log("Mongoose Error: ", error);
});

db.once("open", function () {
    console.log("Mongoose connection successful.");
});

//Routes
app.get("/", function (req, res) {
    Article.find({})
        .exec(function (error, data) {
            if (error) {
                res.send(error);
            }
            else {
                var newsObj = {
                    Article: data
                };
                res.render("index", newsObj);
            }
        });
});

// A GET to scrape the website
app.get("/scrape", function (req, res) {

    request("https://old.reddit.com/r/webdev", function (error, response, html) {

        var $ = cheerio.load(html);
        $("p.title").each(function (i, element) {
            var result = {};

            result.title = $(this)
                .children("a")
                .text();
            result.link = $(this)
                .children("a")
                .attr("href");

            var entry = new Article(result);

            entry.save(function (err, doc) {

                if (err) {
                    console.log(err);
                }

                else {
                    console.log(doc);
                }
            });

        });
        res.redirect("/");
        console.log("Successfully Scraped");
    });
});

app.post("/notes/:id", function (req, res) {
    var newNote = new Note(req.body);
    newNote.save(function (error, doc) {
        if (error) {
            console.log(error);
        }
        else {
            console.log("this is the DOC " + doc);
            Article.findOneAndUpdate({
                "_id": req.params.id
            },
                { $push: { "note": doc._id } }, { new: true }, function (err, doc) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log("note saved: " + doc);
                        res.redirect("/notes/" + req.params.id);
                    }
                });
        }
    });
});

app.get("/notes/:id", function (req, res) {
    console.log("This is the req.params: " + req.params.id);
    Article.find({
        "_id": req.params.id
    }).populate("note")
        .exec(function (error, doc) {
            if (error) {
                console.log(error);
            }
            else {
                var notesObj = {
                    Article: doc
                };
                console.log(notesObj);
                res.render("notes", notesObj);
            }
        });
});

app.get("/delete/:id", function (req, res) {
    Note.remove({
        "_id": req.params.id
    }).exec(function (error, doc) {
        if (error) {
            console.log(error);
        }
        else {
            console.log("note deleted");
            res.redirect("/");
        }
    });
});

// Start the server
app.listen(PORT, function () {
    console.log("App running on PORT" + PORT + "!");
});