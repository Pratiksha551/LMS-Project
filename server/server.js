import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config(); // Loads environment variables from a .env file
import connectDB from './configs/mongodb.js';
import { clerkWebhooks } from './models/webhooks.js';

//Initialize Express
const app = express()

// connect to the databse
await connectDB()

//Middleware
app.use(cors()) //we can connect our backend with other domain

//Routes
app.get('/', (req, res) => {
    res.send("API working.......")
})

app.post('/clerk',express.json(),clerkWebhooks)

//Port
const  PORT = process.env.PORT || 5000

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
    
})