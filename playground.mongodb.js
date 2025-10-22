use('sample_cwh'); //our sample database
//CRUD Operations
//db.movies.deleteOne({"name": "Kabaali"})

//db.createCollection("courses")

// db.courses.insertOne({
//   "name": "Web Dev", 
//   "price": 100, 
// })

// db.courses.insertOne({
//   "name": "AI", 
//   "price": 120
// })

// db.courses.insertOne({
//   "name": "Cloud",
//   price: 100
// })

//db.courses.deleteOne({"name": "Web dev"})
//console.log(db.movies.find())

//updating
db.courses.updateOne(
  {"name": "Cloud"}, 
  {$set: {"price": 220}}
)

db.courses.updateOne(
  {"name": "Cloud"}, 
  {$set: {"Teacher": "Vedashree"}}
)

db.courses.updateOne(
  {"name": "Web Dev"}, 
  {$set: {"Teacher" : "Mercy"}}
)
console.log(db.courses.find())
//console.log(db.movies.find({price: 0}))