require("dotenv").config();
const express = require("express");
const router = express.Router();
const path = require("path");
const mongoose = require("mongoose");
const freelancer = require("../models/freelancer");
const jobs = require("../models/jobs");
const jwt = require("jsonwebtoken");
const { authenticateToken } = require("../utilities");
const { userInfo } = require("os");
//Freelancer new user register route
router.post("/signup", async (req, res) => {
  try {
    let { UserName, Email, password } = req.body.Freelancer;
    let check = await freelancer.findOne({ email: Email });
    if (check) {
      console.log("Email already use");
      res.json({ message: "Email already in use" });
      return;
    } else {
      let user = new freelancer({
        username: UserName,
        email: Email,
        password: password,
      });
      user
        .save()
        .then(() => {
          console.log("User added successfuly");
          const accessToken = jwt.sign(
            { user },
            process.env.ACCESS_TOKEN_SECRET,
            {
              expiresIn: 3600,
            }
          );
          return res.json({
            error: false,
            user,
            accessToken,
            message: "Registration Successful",
          });
        })
        .catch((err) => {
          console.log(err);
          res.json({ message: "Username already exist" });
        });
    }
  } catch (err) {
    console.log(err);
  }
});

//Freelancer existing user login route
router.post("/login", async (req, res) => {
  try {
    let { Email, password } = req.body.Freelancer;
    let check = await freelancer.findOne({ email: Email });
    //console.log(check);
    if (check) {
      let currPassword = check.password;
      if (currPassword === password) {
        const user = { user: check };
        const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
          expiresIn: "3600m",
        });
        console.log("Redirecting you to CLIENT DASHBOARD");
        return res.status(200).json({
          error: false,
          Email,
          accessToken,
          message: "Redirecting you to CLIENT DASHBOARD",
        });
      } else {
        res.status(400).json({ error: true, message: "Wrong Password" });
        console.log("Wrong Password");
      }
    } else {
      res.status(400);
      res.json({
        error: true,
        message: "User does not exist, Create a new user",
      });
      console.log("User does not exist, Create a new User");
    }
  } catch (err) {
    console.log(err);
  }
});

router.get("/getUser", authenticateToken, async (req, res) => {
  const { user } = req.user;
  const isUser = await freelancer.findOne({ _id: user._id });
  console.log(user);
  console.log("__________");
  console.log(isUser);
  if (!isUser) return res.sendStatus(401);
  return res.json({
    user: {
      fullname: isUser.fullname,
      email: isUser.email,
      _id: isUser._id,
      username: isUser.username,
      description: isUser.description,
      skills: isUser.skills,
    },
    message: "",
  });
});

router.put("/edit", authenticateToken, async (req, res) => {
  // console.log(req.params.id);
  try {
    let { user } = req.user;
    //console.log(id);
    let { name, description, skills } = req.body;
    console.log(description);
    console.log(name);
    let Freelancer = await freelancer.findOne({ _id: user._id });
    console.log(Freelancer);
    Freelancer.description = description;
    Freelancer.fullname = name;
    Freelancer.skills = skills;
    Freelancer.save()
      .then(() => {
        res.json({ messsage: "Freelancer profile updated successfully" });
      })
      .catch((err) => {
        console.log(err);
      });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      error: true,
      message: err,
    });
  }
});

router.get("/:userId", async (req, res) => {
  try {
    const user = await freelancer.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/updateChatClients", authenticateToken, async (req, res) => {
  try {
    const userId = req.user.user._id?.toString(); // Logged in freelancer's ID
    const appliedJobs = await jobs.find({
      "applicants._id": userId,
      hired: true,
    });

    const chatClients = appliedJobs.map((job) => job.userId);

    const update = await freelancer.findByIdAndUpdate(userId, {
      $addToSet: { chatClient: { $each: chatClients } },
    });

    res.status(200).json({ msg: "Chat clients updated successfully", update });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

router.post('/rate', async (req, res) => {
  const { applicantId, jobId, completionTimeRating, overallRating } = req.body;

  try {
    const freelancerDoc = await freelancer.findById(applicantId);
    if (!freelancerDoc) {
      return res.status(404).json({ message: 'Freelancer not found' });
    }

    const job = await jobs.findById(jobId);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }

    const totalRatings = freelancerDoc.totalRatings || 0;
    const numberOfRatings = freelancerDoc.numberOfRatings || 0;

    const newTotalRatings = totalRatings + completionTimeRating + overallRating;
    const newNumberOfRatings = numberOfRatings + 2; // Two ratings

    const newAverageRating = newTotalRatings / newNumberOfRatings;

    freelancerDoc.overallRating = newAverageRating;
    freelancerDoc.CompletionRatings = newTotalRatings;
    freelancerDoc.numberOfRatings = newNumberOfRatings;

    await freelancerDoc.save();

    res.status(200).json({ message: 'Rating updated successfully' });
  } catch (error) {
    console.error('Error updating rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;