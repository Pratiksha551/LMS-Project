import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./configs/mongodb.js";
import { clerkWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educator.routes.js";
import { clerkMiddleware } from "@clerk/express";
import connectCloudinary from "./configs/cloudinary.js";
dotenv.config(); // Load environment variables

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(clerkMiddleware())
app.use(express.json()); // Parse JSON globally

// Routes
app.get("/", (req, res) => {
    res.send("API working.......");
});

app.post("/clerk", clerkWebhooks);
app.use("/api/educator",express.json(), educatorRouter)

// Start the server
const startServer = async () => {
    try {
        await connectDB(); // Connect to the database
        await connectCloudinary()
        console.log("Database connected successfully");

        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Server is running on ${PORT}`);
        });
    } catch (error) {
        console.error("Error connecting to the database:", error.message);
        process.exit(1); // Exit the process with failure
    }
};

startServer();