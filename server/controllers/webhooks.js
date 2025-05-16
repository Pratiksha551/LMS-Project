import svix from "svix";
import Stripe from "stripe";
import User from "../models/User.js";
import {Purchase} from "../models/Purchase.js";
import Course from "../models/Course.js";

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// Clerk webhook handler (unchanged from your original)
export const clerkWebhooks = async (req, res) => {
  try {
    const { Webhook } = svix;
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    // Verify Clerk webhook signature
    await whook.verify(JSON.stringify(req.body), {
      "svix-id": req.headers["svix-id"],
      "svix-timestamp": req.headers["svix-timestamp"],
      "svix-signature": req.headers["svix-signature"],
    });

    const { data, type } = req.body;

    switch (type) {
      case "user.created":
        await User.create({
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        });
        return res.json({});

      case "user.updated":
        await User.findByIdAndUpdate(data.id, {
          email: data.email_addresses[0].email_address,
          name: data.first_name + " " + data.last_name,
          imageUrl: data.image_url,
        });
        return res.json({});

      case "user.deleted":
        await User.findByIdAndDelete(data.id);
        return res.json({});

      default:
        return res.json({});
    }
  } catch (error) {
    console.error("Clerk webhook error:", error);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Stripe webhook handler
export const stripeWebhooks = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;

  try {
    // IMPORTANT: req.body must be raw buffer, so setup your express to use express.raw()
    event = stripeInstance.webhooks.constructEvent(
      req.rawBody, // Make sure you pass rawBody, not parsed JSON!
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error(`Stripe webhook signature verification failed: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;

        // Get purchaseId from session metadata
        const purchaseId = session.metadata?.purchaseId;
        if (!purchaseId) {
          console.error("Missing purchaseId in session metadata");
          return res.status(400).json({ success: false, message: "Missing purchaseId" });
        }

        // Load purchase, user, and course data
        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          console.error(`Purchase not found for id: ${purchaseId}`);
          return res.status(404).json({ success: false, message: "Purchase not found" });
        }

        const userData = await User.findById(purchaseData.userId);
        const courseData = await Course.findById(purchaseData.courseId);

        if (!userData || !courseData) {
          console.error("User or Course not found");
          return res.status(404).json({ success: false, message: "User or Course not found" });
        }

        // Add user to course's enrolledStudents if not already added
        if (!courseData.enrolledStudents.includes(userData._id)) {
          courseData.enrolledStudents.push(userData._id);
          await courseData.save();
        }

        // Add course to user's enrolledCourse if not already added
        if (!userData.enrolledCourse.includes(courseData._id)) {
          userData.enrolledCourse.push(courseData._id);
          await userData.save();
        }

        // Update purchase status to completed
        purchaseData.status = "completed";
        await purchaseData.save();

        console.log(`Purchase ${purchaseId} marked as completed.`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        // Find the checkout session related to this payment intent
        const sessions = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });

        if (!sessions.data || sessions.data.length === 0) {
          console.error(`No checkout session found for payment_intent: ${paymentIntentId}`);
          return res.status(404).json({ success: false, message: "Checkout session not found" });
        }

        const session = sessions.data[0];
        const purchaseId = session.metadata?.purchaseId;

        if (!purchaseId) {
          console.error("Missing purchaseId in checkout session metadata");
          return res.status(400).json({ success: false, message: "Missing purchaseId" });
        }

        const purchaseData = await Purchase.findById(purchaseId);
        if (purchaseData) {
          purchaseData.status = "failed";
          await purchaseData.save();
          console.log(`Purchase ${purchaseId} marked as failed.`);
        } else {
          console.error(`Purchase not found for id: ${purchaseId}`);
        }

        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
        break;
    }

    return res.json({ received: true });
  } catch (error) {
    console.error(`Error processing Stripe event: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};
