import mongoose from "mongoose";

const conn = async() =>{
  try{
    await mongoose.connect(process.env.MONGODB_URI);
  console.log("Database connected Successfully");
  }catch(error){
    console.log("Connection failed", error);
  }
}

export default conn;