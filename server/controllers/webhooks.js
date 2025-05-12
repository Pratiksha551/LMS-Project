import svix from "svix"; // Import the default export from svix
import User from "../models/User.js";
import Stripe from "stripe";
import { request, response } from "express";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

//API controller Function to Manage Clerk User with database

export const clerkWebhooks = async (req, res) => {
    try {
        const { Webhook } = svix; // Destructure Webhook from the default export
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        });

        const { data, type } = req.body;

        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                };

                await User.create(userData);
                res.json({});
                break;
            }
            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                };
                await User.findByIdAndUpdate(data.id, userData);
                res.json({});
                break;
            }

            case 'user.deleted': {
                await User.findByIdAndDelete(data.id);
                res.json({});
                break;
            }

            default:
                break;
        }

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
};

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

export const stripeWebhooks = async (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
        console.error(`Webhook Error: ${err.message}`);
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    try {
        switch (event.type) {
            case 'payment_intent.succeeded': {
                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id;

                const session = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId,
                });

                if (!session.data || session.data.length === 0) {
                    console.error(`No session found for payment_intent: ${paymentIntentId}`);
                    return response.status(404).json({ success: false, message: "Session not found" });
                }

                const { purchaseId } = session.data[0].metadata;

                const purchaseData = await Purchase.findById(purchaseId);
                const userData = await User.findById(purchaseData.userId);
                const courseData = await Course.findById(purchaseData.courseId.toString());

                if (!purchaseData || !userData || !courseData) {
                    console.error("Purchase, User, or Course data not found");
                    return response.status(404).json({ success: false, message: "Data not found" });
                }

                courseData.enrolledStudents.push(userData._id);
                try {
                    await courseData.save();
                } catch (error) {
                    console.error(`Error saving course data: ${error.message}`);
                }

                userData.enrolledCourse.push(courseData._id);
                try {
                    await userData.save();
                } catch (error) {
                    console.error(`Error saving user data: ${error.message}`);
                }

                purchaseData.status = 'completed';
                try {
                    await purchaseData.save();
                } catch (error) {
                    console.error(`Error saving purchase data: ${error.message}`);
                }

                break;
            }

            case 'payment_intent.payment_failed': {
                const paymentIntent = event.data.object;
                const paymentIntentId = paymentIntent.id;

                const session = await stripeInstance.checkout.sessions.list({
                    payment_intent: paymentIntentId,
                });

                if (!session.data || session.data.length === 0) {
                    console.error(`No session found for payment_intent: ${paymentIntentId}`);
                    return response.status(404).json({ success: false, message: "Session not found" });
                }

                const { purchaseId } = session.data[0].metadata;

                const purchaseData = await Purchase.findById(purchaseId);
                if (purchaseData) {
                    purchaseData.status = 'failed';
                    try {
                        await purchaseData.save();
                    } catch (error) {
                        console.error(`Error saving purchase data: ${error.message}`);
                    }
                }

                break;
            }

           default:
    console.log(`Unhandled event type ${event.type}`);
    break;
        }

        response.json({ received: true });
    } catch (error) {
        console.error(`Error handling event: ${error.message}`);
        response.status(500).json({ success: false, message: error.message });
    }
};