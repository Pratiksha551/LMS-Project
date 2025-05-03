import svix from "svix";
import User from "../models/User.js";

export const clerkWebhooks = async (req, res) => {
    try {
        const { Webhook } = svix; // Correctly destructure Webhook
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

        // Verify the webhook
        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"],
        });

        const { data, type } = req.body;

        switch (type) {
            case "user.created": {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses?.[0]?.email_address || '',
                    name: `${data.first_name || ''} ${data.last_name || ''}`,
                    imageUrl: data.image_url || '',
                };

                await User.create(userData);
                console.log("User created:", userData);
                res.json({});
                break;
            }
            case "user.updated": {
                const userData = {
                    email: data.email_addresses?.[0]?.email_address || '',
                    name: `${data.first_name || ''} ${data.last_name || ''}`,
                    imageUrl: data.image_url || '',
                };

                await User.findByIdAndUpdate(data.id, userData);
                console.log("User updated:", userData);
                res.json({});
                break;
            }
            case "user.deleted": {
                await User.findByIdAndDelete(data.id);
                console.log("User deleted:", data.id);
                res.json({});
                break;
            }
            default:
                console.log("Unhandled webhook type:", type);
                res.json({});
                break;
        }
    } catch (error) {
        console.error("Error handling webhook:", error);
        res.json({ success: false, message: error.message });
    }
};