import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./configs/mongodb.js";
import { clerkMiddleware } from "@clerk/express";
import { clerkWebhooks, stripeWebhooks } from "./controllers/webhooks.js";
import educatorRouter from "./routes/educator.routes.js";
import connectCloudinary from "./configs/cloudinary.js";
import courseRouter from "./routes/courseRoute.js";
import userRouter from "./routes/userRoute.js";

dotenv.config(); // Load environment variables

// Validate environment variables
const requiredEnvVars = [
  "MONGODB_URI",
  "CLOUDINARY_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_SECRET_KEY",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "CLERK_SECRET_KEY",
  "CURRENCY",
];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing environment variable: ${envVar}`);
    process.exit(1);
  }
}

// Initialize Express
const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON globally
app.use(clerkMiddleware()); // Apply Clerk middleware globally

// Routes
app.get("/", (req, res) => {
  res.send("API working.......");
});

app.post("/clerk", clerkWebhooks);
app.use("/api/educator", educatorRouter);
app.use("/api/course", courseRouter);
app.use("/api/user", userRouter);
app.post(
  "/webhooks/stripe",
  express.raw({ type: "application/json" }),
  (req, res, next) => {
    console.log("Received Stripe webhook request");
    stripeWebhooks(req, res, next);
  }
);

// Start the server
const startServer = async () => {
  try {
    await connectDB(); // Connect to the database
    await connectCloudinary();
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