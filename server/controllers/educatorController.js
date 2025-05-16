import { clerkClient } from '@clerk/express';
import Course from '../models/Course.js';
import { v2 as cloudinary } from 'cloudinary';
import { Purchase } from '../models/Purchase.js';
import User from '../models/User.js';

// Update role to educator
export const updateRoleToEducator = async (req, res) => {
  try {
    const userId = req.auth.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User ID missing' });
    }
    await clerkClient.users.updateUserMetadata(userId, {
      publicMetadata: {
        role: 'educator',
      },
    });
    res.status(200).json({ success: true, message: 'You can publish a course now' });
  } catch (error) {
    console.error('Error updating role:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Add new course
export const addCourse = async (req, res) => {
  try {
    const { courseData } = req.body;
    const imageFile = req.file;
    const educatorId = req.auth.userId;

    if (!imageFile) {
      return res.status(400).json({ success: false, message: 'Thumbnail not attached' });
    }
    if (!educatorId) {
      return res.status(401).json({ success: false, message: 'Educator ID missing' });
    }

    const parsedCourseData = JSON.parse(courseData);
    parsedCourseData.isPublished = true;
    parsedCourseData.educator = educatorId;

    // Validate courseContent
    const { courseContent } = parsedCourseData;
    if (!courseContent || !Array.isArray(courseContent)) {
      return res.status(400).json({ success: false, message: 'Invalid course content' });
    }
    for (const chapter of courseContent) {
      if (!chapter.chapterContent || !Array.isArray(chapter.chapterContent)) {
        return res.status(400).json({ success: false, message: 'Invalid chapter content' });
      }
      for (const lecture of chapter.chapterContent) {
        if (!lecture.lectureId || !lecture.lectureOrder) {
          return res.status(400).json({ success: false, message: 'Lecture ID and order are required' });
        }
      }
    }

    // Upload thumbnail to Cloudinary
    const imageUpload = await cloudinary.uploader.upload(imageFile.path);

    // Create course with thumbnail
    const newCourse = await Course.create({
      ...parsedCourseData,
      courseThumbnail: imageUpload.secure_url,
    });

    console.log(`Created course ${newCourse._id} with isPublished: ${newCourse.isPublished}`);
    res.status(200).json({ success: true, message: 'Course Added' });
  } catch (error) {
    console.error(`Error adding course: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Export educator courses
export const getEducatorCourses = async (req, res) => {
  try {
    const educator = req.auth.userId;
    if (!educator) {
      return res.status(400).json({ success: false, message: 'Educator ID is missing' });
    }
    const courses = await Course.find({ educator });
    console.log(`Fetched ${courses.length} courses for educator ${educator}`);
    res.status(200).json({ success: true, course: courses }); // Changed 'courses' to 'course' to match frontend
  } catch (error) {
    console.error(`Error fetching educator courses: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get educator dashboard data
export const educatorDashboardData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    if (!educator) {
      return res.status(400).json({ success: false, message: 'Educator ID missing' });
    }
    const courses = await Course.find({ educator });
    const totalCourses = courses.length;
    const courseIds = courses.map(course => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed',
    });

    const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

    const enrolledStudentsData = [];
    for (const course of courses) {
      const students = await User.find(
        { _id: { $in: course.enrolledStudents } },
        'name imageUrl'
      );
      students.forEach(student => {
        enrolledStudentsData.push({
          courseTitle: course.courseTitle,
          student,
        });
      });
    }

    res.status(200).json({
      success: true,
      dashboardData: {
        totalEarnings,
        enrolledStudentsData,
        totalCourses,
      },
    });
  } catch (error) {
    console.error(`Error fetching dashboard data: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
  try {
    const educator = req.auth.userId;
    if (!educator) {
      return res.status(400).json({ success: false, message: 'Educator ID missing' });
    }
    const courses = await Course.find({ educator });
    const courseIds = courses.map(course => course._id);

    const purchases = await Purchase.find({
      courseId: { $in: courseIds },
      status: 'completed',
    })
      .populate('userId', 'name imageUrl')
      .populate('courseId', 'courseTitle');

    console.log(`Found ${purchases.length} completed purchases for educator ${educator}`);

    const enrolledstudents = purchases.map(purchase => ({
      student: purchase.userId,
      courseTitle: purchase.courseId.courseTitle,
      purchaseDate: purchase.createdAt,
    }));

    res.status(200).json({ success: true, enrolledstudents }); // Changed to 'enrolledstudents' to match frontend
  } catch (error) {
    console.error(`Error fetching enrolled students: ${error.message}`);
    res.status(500).json({ success: false, message: error.message });
  }
};