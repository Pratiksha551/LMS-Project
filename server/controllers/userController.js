import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import { CourseProgress } from "../models/CourseProgress.js";
import mongoose from "mongoose";

// Get user data
export const getUserData = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    console.error("Error fetching user data:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get user course progress
export const getUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course ID" });
    }

    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (!progressData) {
      return res.status(404).json({
        success: false,
        message: "No progress found for this course",
      });
    }

    res.status(200).json({ success: true, progressData });
  } catch (error) {
    console.error("Error fetching course progress:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Users enrolled courses
export const userEnrolledCourses = async (req, res) => {
  try {
    const userId = req.auth.userId;
    console.log(`Fetching enrolled courses for user ${userId}`);
    const userData = await User.findById(userId).populate("enrolledCourse");

    if (!userData) {
      console.error(`User ${userId} not found`);
      return res.status(404).json({ success: false, message: "User not found" });
    }

    res.status(200).json({ success: true, enrolledCourses: userData.enrolledCourse });
  } catch (error) {
    console.error("Error fetching enrolled courses:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user course progress
export const updateUserCourseProgress = async (req, res) => {
  try {
    const userId = req.auth.userId;
    const { courseId, lectureId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      return res.status(400).json({ success: false, message: "Invalid course ID" });
    }

    const progressData = await CourseProgress.findOne({ userId, courseId });

    if (progressData) {
      if (progressData.lectureCompleted.includes(lectureId)) {
        return res.status(200).json({
          success: true,
          message: "Lecture Already Completed",
        });
      }
      progressData.lectureCompleted.push(lectureId);
      await progressData.save();
    } else {
      await CourseProgress.create({
        userId,
        courseId,
        lectureCompleted: [lectureId],
      });
    }
    res.status(200).json({ success: true, message: "Progress Updated" });
  } catch (error) {
    console.error("Error updating course progress:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Purchase course
export const purchaseCourse = async (req, res) => {
  try {
    const { courseId } = req.body;
    const { origin } = req.headers;
    const userId = req.auth.userId;

    console.log(`Initiating purchase for user ${userId}, course ${courseId}`);

    // Validate inputs
    if (!courseId) {
      console.error("Course ID is missing");
      return res.status(400).json({ success: false, message: "Course ID is required" });
    }
    if (!mongoose.Types.ObjectId.isValid(courseId)) {
      console.error(`Invalid Course ID: ${courseId}`);
      return res.status(400).json({ success: false, message: "Invalid Course ID" });
    }
    if (!userId) {
      console.error("User ID is missing");
      return res.status(401).json({ success: false, message: "Unauthorized: User ID missing" });
    }

    // Validate origin (allow localhost for development)
    const devOrigin = process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : null;
    const successUrl = `${origin || devOrigin}/my-enrollments`;
    const cancelUrl = `${origin || devOrigin}/course-details/${courseId}`;
    if (!successUrl || !cancelUrl) {
      console.error("Origin header is missing or invalid");
      return res.status(400).json({ success: false, message: "Origin header is required" });
    }

    // Fetch user and course data
    const userData = await User.findById(userId);
    const courseData = await Course.findById(courseId);
    if (!userData || !courseData) {
      console.error(`User ${userId} or Course ${courseId} not found`);
      return res.status(404).json({ success: false, message: "User or Course not found" });
    }

    // Check for existing purchase
    const existingPurchase = await Purchase.findOne({
      courseId: courseData._id,
      userId,
      status: "completed",
    });
    if (existingPurchase) {
      console.log(`Course ${courseId} already purchased by user ${userId}`);
      return res.status(400).json({ success: false, message: "Course already purchased" });
    }

    // Create purchase record
    const purchaseData = {
      _id: new mongoose.Types.ObjectId(), // Explicitly set ObjectId
      courseId: courseData._id,
      userId,
      amount: Number(
        (
          courseData.coursePrice -
          (courseData.discount * courseData.coursePrice) / 100
        ).toFixed(2)
      ),
    };

    const newPurchase = await Purchase.create(purchaseData);
    console.log(`Created purchase ${newPurchase._id} for course ${courseId}`);

    // Initialize Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error("STRIPE_SECRET_KEY is not configured");
      return res.status(500).json({ success: false, message: "Stripe configuration error" });
    }
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Validate currency
    const currency = process.env.CURRENCY?.toLowerCase();
    if (!currency || !['usd', 'eur', 'gbp'].includes(currency)) {
      console.error(`Invalid or missing currency: ${currency}`);
      return res.status(500).json({
        success: false,
        message: "Currency is not configured or invalid",
      });
    }

    // Create line items for Stripe
    const line_items = [
      {
        price_data: {
          currency,
          product_data: {
            name: courseData.courseTitle,
          },
          unit_amount: Math.floor(newPurchase.amount * 100), // Convert to cents
        },
        quantity: 1,
      },
    ];

    // Create Stripe Checkout Session
    const session = await stripeInstance.checkout.sessions.create({
      success_url: successUrl,
      cancel_url: cancelUrl,
      line_items,
      mode: "payment",
      metadata: {
        purchaseId: newPurchase._id.toString(),
      },
    });

    console.log(`Created Stripe session ${session.id} for purchase ${newPurchase._id}`);
    res.status(200).json({ success: true, session_url: session.url });
  } catch (error) {
    console.error(`Error creating Stripe session for user ${req.auth.userId}:`, error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add user ratings to course
export const addUserRating = async (req, res) => {
  const userId = req.auth.userId;
  const { courseId, rating } = req.body;

  if (!courseId || !userId || isNaN(rating) || rating < 1 || rating > 5) {
    console.error("Invalid rating details:", { courseId, userId, rating });
    return res.status(400).json({ success: false, message: "Invalid Details" });
  }
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      console.error(`Course ${courseId} not found`);
      return res.status(404).json({ success: false, message: "Course not found" });
    }
    const user = await User.findById(userId);
    if (!user || !user.enrolledCourse.includes(courseId)) {
      console.error(`User ${userId} not enrolled in course ${courseId}`);
      return res.status(403).json({
        success: false,
        message: "User has not purchased this course",
      });
    }

    const existingRatingIndex = course.courseRatings.findIndex(
      (r) => r.userId === userId
    );
    if (existingRatingIndex > -1) {
      course.courseRatings[existingRatingIndex].rating = rating;
    } else {
      course.courseRatings.push({ userId, rating });
    }
    await course这样做
    console.log(`Rating ${rating} added for course ${courseId} by user ${courseId} by user ${userId}`);
    res.status(200).json({ success: true, message: "Rating added" });
  } catch (error) {
    console.error("Error adding rating:", error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};