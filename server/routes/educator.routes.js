import express from "express";
import { addCourse, updateRoleToEducator } from "../controllers/educatorController.js";
import upload from "../configs/multer.js";
import { protectEducator } from "../middleware/authMiddleware.js";

const educatorRouter = express.Router()

//add Educator Role
educatorRouter.get('/update-role', updateRoleToEducator)
educatorRouter.post('/add-course', upload.single('image'),protectEducator, addCourse)

export default educatorRouter;