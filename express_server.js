//importing helper functions
const {
  generateRandomString,
  urlsForUser,
  getUserByEmail
} = require("./helperFunctions");

//setting up setup variables
const mongo = require("mongodb");
const mongoose = require("mongoose");
const assert = require("assert");
const express = require("express");
const bcrypt = require("bcrypt");
const methodOverride = require("method-override");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const cookieSession = require("cookie-session");

const db = require("./config/keys").mongoURI;

const app = express();

app.set("view engine", "ejs");

//Middleware to parse cookies and body
//! The program deletes session cookies on redirects without cookieParser
app.use(cookieParser());
app.use(
  cookieSession({
    name: "userId",
    keys: ["id"]
  })
);
app.use(bodyParser.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

//connect to mongo
mongoose
  .connect(db)
  .then(() => console.log("mongoDB connects"))
  .catch(err => console.log(err));

const PORT = process.env.PORT || 8080; // default port 8080

/** --URL Database format--
urlDatabase={
  shortURL:{
    longURL:'asdf.ca', 
    userID:"qwer"
  }
}

--Users database format--
users={
  user2: {
    id: "user2",
    email: "user2@gmail.com",
    password: "password"
  }
}
*/
const urlDatabase = {};

app.post("/login", (req, res) => {
  for (user in users) {
    if (req.body.email === users[user].email) {
      if (bcrypt.compareSync(req.body.password, users[user].password)) {
        req.session.user_id = users[user].id;
        req.session.email = users[user].email;
        return res.redirect("/urls");
      }
    }
  }
  req.session.wrongLogin = true;
  res.redirect("/login");
});

app.get("/login", (req, res) => {
  if (req.session.email) {
    return res.redirect("/urls");
  }
  let templateVars = {
    username: req.session.email || "",
    wrongPassword: req.session.wrongLogin
  };
  res.render("login", templateVars);
});

app.get("/register", (req, res) => {
  if (req.session.email) {
    return res.redirect("/urls");
  }
  let templateVars = {
    username: req.session.email,
    emailExists: req.session.emailExists
  };
  res.render("register", templateVars);
});

app.post("/register", (req, res) => {
  //Hashes password
  const hashedPassword = bcrypt.hashSync(req.body.password, 10);

  //if either parameter is empty, set cookie to equal blank so that .ejs file will present the text
  if (req.body.email === "" || req.body.password === "") {
    req.session.emailExists = "blank";
    return res.redirect("/register");
  }

  if (getUserByEmail(req.body.email, users)) {
    req.session.emailExists = "true";
    return res.redirect("/register");
  }

  //random string for user id
  let temp = generateRandomString();
  const id = temp;
  temp = {
    id,
    email: req.body.email,
    password: hashedPassword
  };

  req.session.user_id = temp.id;
  req.session.email = temp.email;
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  req.session = null;
  res.redirect("/urls/");
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL].longURL;
  console.log(longURL);
  if (longURL.slice(0, 4) !== "http") {
    longURL = "https://" + longURL;
  }
  res.redirect(longURL);
});

app.get("/urls/new", (req, res) => {
  if (!req.session.email) {
    return res.redirect("/login");
  }
  let templateVars = {
    username: req.session.email
  };
  res.render("urls_new", templateVars);
});

app.delete("/urls/:shortURL/", (req, res) => {
  if (req.session.user_id === urlDatabase[req.params.shortURL].userID) {
    delete urlDatabase[req.params.shortURL];
  }
  res.redirect("/urls/");
});

app.put("/urls/:shortURL/", (req, res) => {
  if (req.session.user_id === urlDatabase[req.params.shortURL].userID) {
    urlDatabase[req.params.shortURL] = {
      longURL: req.body.longURL,
      userID: req.session.user_id
    };
    res.redirect(`/urls/${req.params.shortURL}`);
  } else {
    res.send("not authorized");
  }
});

app.get("/urls/:shortURL", (req, res) => {
  let templateVars = {
    shortURL: req.params.shortURL,
    longURL: urlDatabase[req.params.shortURL].longURL,
    username: req.session.email
  };
  res.render("urls_show", templateVars);
});

app.get("/urls", (req, res) => {
  let templateVars = {
    urls: urlsForUser(req.session.user_id, urlDatabase),
    username: req.session.email
  };
  if (!req.session.email) {
    return res.redirect("/login");
  } else {
    res.render("urls_index", templateVars);
  }
});

app.post("/urls", (req, res) => {
  let temp = generateRandomString();
  urlDatabase[temp] = {
    longURL: req.body.longURL,
    userID: req.session.user_id
  };

  res.redirect(`/urls/${temp}`);
});

app.get("/", (req, res) => {
  res.redirect("/urls");
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
