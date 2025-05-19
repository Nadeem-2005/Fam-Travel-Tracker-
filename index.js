import express from "express";
import bodyParser from "body-parser";
import pg from "pg";

const app = express();
const port = 3000;

const db = new pg.Client({
  user: "postgres",
  host: "localhost",
  database: "world",
  password: "514554",
  port: 5432,
});
db.connect();

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let currentUserId = 1;

let users = [];

async function checkVisisted(user_id) {
  const result = await db.query(
    "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id  WHERE user_id = ($1)",
    [user_id]
  );
  let countries = [];
  result.rows.forEach((country) => {
    countries.push(country.country_code);
  });
  //NOTE : color is calculated seperately because when a new user is encountered, he will definitely have a color when he might not have any
  // data related to countries visited. Thus a joined table will return null for a new user thus creating an error.
  const result2 = await db.query("SELECT color from users WHERE id = ($1)", [
    user_id,
  ]);
  var user_color = result2.rows[0].color;
  return { countries, user_color };
}

app.get("/", async (req, res) => {
  let { countries, user_color } = await checkVisisted(currentUserId);
  const result = await db.query("SELECT * FROM users");
  users = result.rows;

  console.log(countries, user_color);

  res.render("index.ejs", {
    countries: countries,
    total: countries.length,
    users: users,
    color: user_color,
  });
});

app.post("/add", async (req, res) => {
  const input = req.body.country;

  try {
    const result = await db.query(
      "SELECT country_code FROM countries WHERE LOWER(country_name) LIKE '%' || $1 || '%';",
      [input.toLowerCase()]
    );

    const data = result.rows[0];
    const userID = currentUserId;
    const countryCode = data.country_code;
    // console.log(currentUserId);

    try {
      await db.query(
        "INSERT INTO visited_countries (user_id, country_code) VALUES ( ($1), ($2) )",
        [userID, countryCode]
      );
      res.redirect("/");
    } catch (err) {
      console.log(err);
    }
  } catch (err) {
    console.log(err);
  }
});

app.post("/user", async (req, res) => {
  if (req.body.add === "new") {
    res.render("new.ejs");
  } else {
    const input = req.body.user;
    currentUserId = input;
    res.redirect("/");
    //NOTE :- the below approach fails since a new user doesnt get any data entry in joined table due to absence of visited countries.
    // const result = await db.query(
    //   "SELECT country_code FROM visited_countries JOIN users ON users.id = user_id  WHERE user_id = $1",
    //   [input]
    // );
    // // console.log(result); //uncomment this line to check the input format
    // let countries = [];
    // result.rows.forEach((country) => {
    //   countries.push(country.country_code);
    // });
    // var user_color = ;
    // res.render("index.ejs", {
    //   countries: countries,
    //   total: countries.length,
    //   users: users,
    //   color: user_color,
    // });
  }
});

app.post("/new", async (req, res) => {
  //Hint: The RETURNING keyword can return the data that was inserted.
  //https://www.postgresql.org/docs/current/dml-returning.html
  const name = req.body.name;
  const color = req.body.color;

  const result = await db.query(
    "INSERT INTO users (name, color) VALUES($1, $2) RETURNING *;",
    [name, color]
  );

  console.log(result);
  const id = result.rows[0].id;
  currentUserId = id;

  res.redirect("/");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
