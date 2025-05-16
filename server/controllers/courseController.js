// ✅ REVISED controller logic to ensure:
// 1. Stripe webhook correctly updates purchase status
// 2. New course added by educator is published and shown on homepage

import Course from "../models/Course.js";
import User from "../models/User.js";
import { Purchase } from "../models/Purchase.js";
import { CourseProgress } from "../models/CourseProgress.js";
import { clerkClient } from '@clerk/express';
import { v2 as cloudinary } from 'cloudinary';
import Stripe from "stripe";
import mongoose from "mongoose";
import svix from "svix";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

export const getAllCourse = async (req, res) => {
  try {
    const courses = await Course.find({ isPublished: true })
      .select(['-courseContent', '-enrolledStudents'])
      .populate({ path: 'educator' });

    res.json({ success: true, courses });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

export const getCourseId = async (req, res) => {
  const { id } = req.params;
  try {
    const courseData = await Course.findById(id).populate({ path: 'educator' });

    courseData.courseContent.forEach(chapter => {
      chapter.chapterContent.forEach(lecture => {
        if (!lecture.isPreviewFree) {
          lecture.lectureUrl = "";
        }
      });
    });

    res.json({ success: true, courseData });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
