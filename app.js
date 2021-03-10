//jshint esversion:6

//Declaring constants for usage
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const { name } = require("ejs");
const _ = require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//Connecting to the Mongoose server
mongoose.connect("mongodb://localhost/todolistDB", {useNewUrlParser: true, useUnifiedTopology: true});


//Creating the Item schema, model and the items themselves
const itemsSchema = new mongoose.Schema({
  name: String
});

const Item = mongoose.model("Item", itemsSchema)

const item1 = new Item({
  name: "Dobrodošli u Vaš popis zadataka!"
});

const item2 = new Item({
  name: "Kliknite na + kako biste dodali novi zadatak."
});

const item3 = new Item({
  name : "<--- Kliknite ovdje kako biste izbrisali zadatak."
});

const defaultItems = [item1, item2, item3];


//Creating the List schema and model
const listSchema = new mongoose.Schema({
  name: String,
  items: [itemsSchema]
});

const List = mongoose.model("List", listSchema);


//Handling the root route with the list items
app.get("/", function(req, res) {
  Item.find({}, function (err, results) {
    if (results.length === 0) {
      Item.insertMany(defaultItems, function (err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Successfully saved the items to the DB.");
        }
      });
      res.redirect("/");
    } else {
      res.render("list", { listTitle: "Danas", newListItems: results });
    }
  });
});


//Posting the new items we inserted into the list 
//Also handling custom lists and their items
app.post("/", function(req, res){
  	const itemName = req.body.newItem; //The list item we just entered
    const listName = req.body.list; //The list title

    //Creating the new item we just entered
    const item = new Item({
      name: itemName
    });

    //Checking if we are on the root route
    //If we are, save the item there and redirect to root route so show it
    if(listName === "Danas"){
      item.save();
      res.redirect("/");
    } else { 
      //If not, find the list with this name, its items and push the new one
      //Save the updated list and redirect to the route with this list name
      List.findOne({name: listName}, function(err, result){
        result.items.push(item);
        result.save();
        res.redirect("/" + listName);
      })
    }


    
});


//This is for the form with which we delete the checked items 
app.post("/delete", function(req, res){

  //With the help of the form, we can get the ID of the item
  //We can then use the ID to find the item and remove it from our list

  const idOfChecked = req.body.checkbox;
  const listName = req.body.listName;
  if(listName === "Danas"){
    Item.findByIdAndRemove(idOfChecked, function(err){
      if(err){
        console.log(err);
      } else {
        console.log("Successfully deleted item.");
        res.redirect("/");
      }
    });
  } else {

    //If it's a custom list, the deletion is going to look this 
    //We are going to find the list by name
    //We are going to use the pull to delete the item with the ID
    //Then we're going to redirect to that certain list
      List.findOneAndUpdate(
        {name: listName}, //first parameter
        {$pull: {items: {_id: idOfChecked}}}, //second parameter
        function(err, result){ //third one, a callback function
          if(!err){
            res.redirect("/" + listName);
          }
        })
  }
  
})


app.get("/:customListName", function(req, res){
  //We pull the custom list name from the request parameter
  const customListName = _.capitalize(req.params.customListName);

  //We then check if we can find a list by that name
  List.findOne({name: customListName}, function(err, result){
    if(!err){
      if(!result){
        //If we didn't find any, we create a new list, save it and redirect
        const list = new List({
          name: customListName,
          items: defaultItems
        });
        list.save();
        res.redirect("/" + customListName);
      } else {
        //If it exists, we show the list
        res.render("list", { listTitle: result.name, newListItems: result.items})
      }
    } else {
      console.log(err)
    }
  });

  
})


app.get("/about", function(req, res){
  res.render("about");
});

app.listen(3000, function() {
  console.log("Server started on port 3000");
});
