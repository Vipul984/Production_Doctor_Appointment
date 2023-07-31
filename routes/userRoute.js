const express = require('express');
const router = express.Router();
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middlewares/authMiddleware');
const Appointment = require('../models/appointmentModel');
const moment = require('moment');
router.post('/register', async (req, res) => {

    try {

        const userexist = await User.findOne({ email: req.body.email });
        if (userexist) {
            return res.status(200).send({ message: "User already exist", success: false });
        }
        const password = req.body.password;
        const salt = await bcrypt.genSalt(10);
        const hashedpass = await bcrypt.hash(password, salt);

        req.body.password = hashedpass;

        const newUser = new User(req.body);

        await newUser.save();
        res.status(200).send({ message: "User created successfully", success: true });



    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Error creatin user", success: false, error });

    }
})

router.post('/login', async (req, res) => {

    try {
        const user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(200).send({ message: "user does'nt exist", success: false });
        }
        const isMatch = await bcrypt.compare(req.body.password, user.password, function (err, result) {
            if (!result) {
                return res.status(200).send({ message: "incorrect password", success: false });
            } else {
                const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });
                res.status(200).send({ message: "Login successful", success: true, data: token });
            }

        });



    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "error logging in", success: false, error });

    }
})
router.post('/get-user-info-by-id', authMiddleware, async (req, res) => {
    try {
        const user = await User.findOne({ _id: req.body.userId });
        user.password = undefined;
        if (!user) {
            return res.status(200).send({ message: "User does not exist", success: false });
        } else {
            return res.status(200).send({ success: true, data: user });
        }

    } catch (error) {

        return res.status(500).send({ message: "Error finding user", success: false });
    }
})

router.post('/apply-doctor-account', authMiddleware, async (req, res) => {

    try {
        console.log(req.body);
        const newdoctor = new Doctor({ ...req.body, status: "pending" });
        await newdoctor.save();
        const adminUser = await User.findOne({ isAdmin: true });
        const unseenNotification = adminUser.unseenNotification;
        unseenNotification.push({
            type: "new-doctor-request",
            message: `${newdoctor.firstName} ${newdoctor.lastName} has applied for a doctor account`,
            data: {
                doctorId: newdoctor._id,
                name: newdoctor.firstName + " " + newdoctor.lastName
            },
            onclickPath: "/admin/doctorslist"
        })
        await User.findByIdAndUpdate(adminUser._id, { unseenNotification });
        res.status(200).send({ message: "applying doctor account successfull", success: true });


    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Error applying doctor account ", success: false, error });

    }
})

router.post('/mark-all-notifications-as-seen', authMiddleware, async (req, res) => {

    try {

        const user = await User.findOne({ _id: req.body.userId });
        const unseenNotification = user.unseenNotification;
        const seenNotification = user.seenNotification;
        seenNotification.push(...unseenNotification);
        user.seenNotification = seenNotification;
        user.unseenNotification = [];
        const updateUser = await user.save();
        updateUser.password = undefined;
        res.status(200).send({ message: "All noifications marked as seen", success: true, data: updateUser, });






    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Error applying doctor account ", success: false, error });

    }
})

router.post('/delete-all-notifications', authMiddleware, async (req, res) => {

    try {

        const user = await User.findOne({ _id: req.body.userId });

        user.seenNotification = [];
        user.unseenNotification = [];
        const updateUser = await user.save();
        updateUser.password = undefined;
        res.status(200).send({ message: "All noifications deleted", success: true, data: updateUser });






    } catch (error) {
        console.log(error);
        res.status(500).send({ message: "Error applying doctor account ", success: false, error });

    }
})

router.get("/get-all-approved-doctors", authMiddleware, async (req, res) => {
    try {
        const doctors = await Doctor.find({ status: "approved" });
        res.status(200).send({ message: "Doctors fetched successfully", success: true, data: doctors });
    } catch (error) {

        console.log(error);

    }
})


router.post("/book-appointment", authMiddleware, async (req, res) => {
    try {
        req.body.status = 'pending';
        req.body.date = moment(req.body.date, 'DD-MM-YYYY').toISOString();
        req.body.time = moment(req.body.time, "HH:mm").toISOString();

        const newAppoint = new Appointment(req.body);
        await newAppoint.save();
        const user = await User.findOne({ _id: req.body.doctorInfo.userId });
        user.unseenNotification.push({
            type: 'new-appointment-request',
            message: `A new appointment request has been made by ${req.body.userInfo.name}`,
            onclickPath: "/doctor/appointment"
        });
        await user.save();
        res.status(200).send({ message: 'Appointment booked successfully', success: true });
    } catch (error) {

        res.status(500).send({ message: "Error in booking", success: false, error });
    }
})

router.post("/check-booking-availability", authMiddleware, async (req, res) => {
    try {
        const date = moment(req.body.date, 'DD-MM-YYYY').toISOString();
        const fromTime = moment(req.body.time, "HH:mm").subtract(1, 'hours').toISOString();
        const toTime = moment(req.body.time, "HH:mm").add(1, 'hours').toISOString();
        const doctorId = req.body.doctorId;

        const appointments = await Appointment.find({
            doctorId,
            date,
            time: { $gte: fromTime, $lte: toTime },

        });

        if (appointments.length > 0) {
            return res.status(200).send({ message: 'Appointment not available', success: false });
        }
        else {
            return res.status(200).send({ message: 'Appointment available', success: true });
        }


    } catch (error) {
        console.log(error);

        res.status(500).send({ message: "Error in booking", success: false, error });
    }
})

router.get("/get-appointments-by-user-id", authMiddleware, async (req, res) => {
    try {
        const appointments = await Appointment.find({ userId: req.body.userId });
        res.status(200).send({
            message: "appointments fetched successfully",
            success: true,
            data: appointments
        });
    } catch (error) {
        res.status(200).send({
            message: "error fetching appointments",
            success: false,
            error
        });

    }
})

module.exports = router;