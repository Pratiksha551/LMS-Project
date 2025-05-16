import svix from 'svix';
import Stripe from 'stripe';
import User from '../models/User.js';
import { Purchase } from '../models/Purchase.js';
import Course from '../models/Course.js';
import mongoose from 'mongoose';

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

// Clerk webhook handler
export const clerkWebhooks = async (req, res) => {
  try {
    const { Webhook } = svix;
    const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

    await whook.verify(JSON.stringify(req.body), {
      'svix-id': req.headers['svix-id'],
      'svix-timestamp': req.headers['svix-timestamp'],
      'svix-signature': req.headers['svix-signature'],
    });

    const { data, type } = req.body;

    switch (type) {
      case 'user.created':
        await User.create({
          _id: data.id,
          email: data.email_addresses[0].email_address,
          name: data.first_name + ' ' + data.last_name,
          imageUrl: data.image_url,
        });
        console.log(`Created user ${data.id}`);
        return res.status(200).json({});

      case 'user.updated':
        await User.findByIdAndUpdate(data.id, {
          email: data.email_addresses[0].email_address,
          name: data.first_name + ' ' + data.last_name,
          imageUrl: data.image_url,
        });
        console.log(`Updated user ${data.id}`);
        return res.status(200).json({});

      case 'user.deleted':
        await User.findByIdAndDelete(data.id);
        console.log(`Deleted user ${data.id}`);
        return res.status(200).json({});

      default:
        console.log(`Unhandled Clerk event type: ${type}`);
        return res.status(200).json({});
    }
  } catch (error) {
    console.error('Clerk webhook error:', error.message);
    return res.status(400).json({ success: false, message: error.message });
  }
};

// Stripe webhook handler
export const stripeWebhooks = async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  // Log raw body availability
  if (!req.rawBody) {
    console.error('Missing req.rawBody for Stripe webhook');
    return res.status(400).send('Webhook Error: Missing raw body');
  }

  // Verify webhook signature
  try {
    event = stripeInstance.webhooks.constructEvent(
      req.rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
    console.log(`Received Stripe event: ${event.type}, ID: ${event.id}, Session ID: ${event.data.object.id}`);
  } catch (err) {
    console.error(`Stripe webhook signature verification failed: ${err.message}`);
    console.error(`Signature: ${sig}, Webhook Secret: ${process.env.STRIPE_WEBHOOK_SECRET ? 'Set' : 'Missing'}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const purchaseId = session.metadata?.purchaseId;

        console.log(`Processing checkout.session.completed for session ${session.id}, purchaseId: ${purchaseId}`);

        // Validate purchaseId
        if (!purchaseId) {
          console.error(`Missing purchaseId in session metadata for session ${session.id}`);
          return res.status(400).json({ success: false, message: 'Missing purchaseId' });
        }
        if (!mongoose.Types.ObjectId.isValid(purchaseId)) {
          console.error(`Invalid purchaseId format: ${purchaseId}`);
          return res.status(400).json({ success: false, message: 'Invalid purchaseId format' });
        }

        // Fetch purchase record
        const purchaseData = await Purchase.findById(purchaseId);
        if (!purchaseData) {
          console.error(`Purchase not found for id: ${purchaseId}`);
          return res.status(404).json({ success: false, message: 'Purchase not found' });
        }
        if (purchaseData.status === 'completed') {
          console.log(`Purchase ${purchaseId} already completed`);
          return res.status(200).json({ received: true });
        }

        // Fetch user and course
        const userData = await User.findById(purchaseData.userId);
        const courseData = await Course.findById(purchaseData.courseId);
        if (!userData || !courseData) {
          console.error(
            `User ${purchaseData.userId} or Course ${purchaseData.courseId} not found`
          );
          return res.status(404).json({ success: false, message: 'User or Course not found' });
        }

        // Update enrollment data
        if (!courseData.enrolledStudents.includes(userData._id)) {
          courseData.enrolledStudents.push(userData._id);
          await courseData.save();
          console.log(
            `Added user ${userData._id} to course ${courseData._id} enrolledStudents`
          );
        }
        if (!userData.enrolledCourse.includes(courseData._id)) {
          userData.enrolledCourse.push(courseData._id);
          await userData.save();
          console.log(
            `Added course ${courseData._id} to user ${userData._id} enrolledCourse`
          );
        }

        // Update purchase status
        purchaseData.status = 'completed';
        await purchaseData.save();
        console.log(`Purchase ${purchaseId} marked as completed`);

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        console.log(`Processing payment_intent.payment_failed for paymentIntent ${paymentIntentId}`);

        // Retrieve session for payment intent
        const sessions = await stripeInstance.checkout.sessions.list({
          payment_intent: paymentIntentId,
          limit: 1,
        });

        if (!sessions.data || sessions.data.length === 0) {
          console.error(`No checkout session found for payment_intent: ${paymentIntentId}`);
          return res.status(404).json({ success: false, message: 'Checkout session not found' });
        }

        const session = sessions.data[0];
        const purchaseId = session.metadata?.purchaseId;

        if (!purchaseId || !mongoose.Types.ObjectId.isValid(purchaseId)) {
          console.error(`Missing or invalid purchaseId in session metadata: ${purchaseId}`);
          return res.status(400).json({ success: false, message: 'Invalid purchaseId' });
        }

        // Update purchase status to failed
        const purchaseData = await Purchase.findById(purchaseId);
        if (purchaseData) {
          purchaseData.status = 'failed';
          await purchaseData.save();
          console.log(`Purchase ${purchaseId} marked as failed`);
        } else {
          console.error(`Purchase not found for id: ${purchaseId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
        break;
    }

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error(`Error processing Stripe event ${event.type}: ${error.message}`);
    return res.status(500).json({ success: false, message: error.message });
  }
};