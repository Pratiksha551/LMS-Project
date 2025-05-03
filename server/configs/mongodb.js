import mongoose from 'mongoose'
import dotenv from 'dotenv'
dotenv.config(); 

//Connect to the MongoDB databse

const connectDB = async ()=>{
    mongoose.connection.on('connected',()=>console.log('Databse connected'))

    await mongoose.connect(`${process.env.MONGODB_URI}/lms`)
}

export default connectDB