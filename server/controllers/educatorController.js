import { clerkClient } from '@clerk/express'
import Course from '../models/Course.js'
import { v2 as cloudinary } from 'cloudinary'
import { Purchase } from '../models/Purchase.js'
import User from '../models/User.js'

// update role to educator
export const updateRoleToEducator = async (req, res) => {
    try {
        const userId = req.auth.userId

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata:{
                role: 'educator',
            }
        })
        res.json({success: true, message: 'You can publish a course now'})
    } catch (error) {
        res.json({ success: false, message: error.message})
    }
}

//Add new course 
export const addCourse = async (req, res) => {
    try {
        const { courseData } = req.body;
        const imageFile = req.file;
        const educatorId = req.auth.userId;

        if (!imageFile) {
            return res.json({ success: false, message: "Thumbnail not attached" });
        }

        const parsedCourseData = JSON.parse(courseData);
        parsedCourseData.isPublished = true; // Ensure the course is published

        // Validate courseContent
        const { courseContent } = parsedCourseData;
        if (!courseContent || !Array.isArray(courseContent)) {
            return res.json({ success: false, message: "Invalid course content" });
        }

        // Validate chapters and lectures
        for (const chapter of courseContent) {
            if (!chapter.chapterContent || !Array.isArray(chapter.chapterContent)) {
                return res.json({ success: false, message: "Invalid chapter content" });
            }

            for (const lecture of chapter.chapterContent) {
                if (!lecture.lectureId || !lecture.lectureOrder) {
                    return res.json({ success: false, message: "Lecture ID and order are required" });
                }
            }
        }

        // Add educator ID to the course data
        parsedCourseData.educator = educatorId;

        // Create the course in the database
        const newCourse = await Course.create(parsedCourseData);

        // Upload the thumbnail to Cloudinary
        const imageUpload = await cloudinary.uploader.upload(imageFile.path);
        newCourse.courseThumbnail = imageUpload.secure_url;

        // Save the course with the thumbnail URL
        await newCourse.save();

        res.json({ success: true, message: 'Course Added' });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};
//export educator courses 
export const getEducatorCourses = async (req, res) => {
    try {
        const educator = req.auth.userId
        const courses = await Course.find({educator})
        res.json({ seccess: true, courses})
    } catch (error) {
        res.json({ success: false, message: error.message})
    }
}

// get educator dashboard data ( Total Earning, Enrolled Students, No. of courses)
export const educatorDashboardData = async (req, res) => {
    try {
        const educator = req.auth.userId;
        const courses = await Course.find({ educator });
        const totalCourses = courses.length;

        const courseIds = courses.map(course => course._id);

        // Fetch purchases for the educator's courses
        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed',
        });

        // Calculate total earnings
        const totalEarnings = purchases.reduce((sum, purchase) => sum + purchase.amount, 0);

        // Collect enrolled students data
        const enrolledStudentsData = [];
        for (const course of courses) {
            const students = await User.find({
                _id: { $in: course.enrolledStudents },
            }, 'name imageUrl');

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student,
                });
            });
        }

        res.json({
            success: true,
            dashboardData: {
                totalEarnings,
                enrolledStudentsData,
                totalCourses,
            },
        });
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

// Get Enrolled Students Data with Purchase Data
export const getEnrolledStudentsData = async (req, res) => {
    try{
        const educator = req.auth.userId;
        const courses = await Course.find({educator});
        const courseIds = courses.map(course => course._id)

        const purchases = await Purchase.find({
            courseId: { $in: courseIds },
            status: 'completed'
        }).populate('userId','name imageUrl').populate('courseId','courseTitle')

         const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
         }));
         res.json({success: true, enrolledStudents})
    }
    catch(error) {
        res.json({success: false, message: error.message})

    }
}

