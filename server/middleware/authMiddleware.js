import { clerkClient } from "@clerk/express";

// Middleware (Protect Educator Routes)
export const protectEducator = async (req, res, next) => {
    try {
        console.log("req.auth:", req.auth); // Debug log

        // Check if req.auth exists and contains userId
        if (!req.auth || !req.auth.userId) {
            return res.status(401).json({ success: false, message: "Unauthorized Access: Missing user ID" });
        }

        const userId = req.auth.userId;
        const response = await clerkClient.users.getUser(userId);

        // Check if the user has the 'educator' role
        if (response.publicMetadata.role !== "educator") {
            return res.status(403).json({ success: false, message: "Unauthorized Access: Educator role required" });
        }

        // Proceed to the next middleware or controller
        next();
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};