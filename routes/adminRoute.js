const express = require('express');
const router = express.Router();
const User = require("../models/userModel");
const Doctor = require("../models/doctorModel");
const authMiddleware = require('../middlewares/authMiddleware');

router.get("/get-all-doctors", authMiddleware, async (req, res) => {
    try {
        const doctors = await Doctor.find({});
        res.status(200).send({ message: "Doctors fetched successfully", success: true, data: doctors });
    } catch (error) {

        console.log(error);

    }
})


router.get("/get-all-users", authMiddleware, async (req, res) => {
    try {
        const users = await User.find({});
        res.status(200).send({ message: "Users fetched successfully", success: true, data: users });
    } catch (error) {

        console.log(error);

    }
})

router.post("/change-doctor-account-status", authMiddleware, async (req, res) => {
    try {
        const { doctorId, status, userId } = req.body;
        const doctor = await Doctor.findByIdAndUpdate(doctorId, {
            status,
        });

        const user = await User.findOne({ _id: doctor.userId });
        const unseenNotification = user.unseenNotification;
        unseenNotification.push({
            type: " new-doctor-request-changed",
            message: `Your doctor account has been ${status}`,
            onClickPath: "/notifications"
        });
        if (status === "approved") {
            user.isDoctor = true;
        }

        await user.save();
        res.status(200).send({ message: "Doctor status approved successfully", success: true, data: doctor });

    } catch (error) {

        console.log(error);

    }
})

module.exports = router;