const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
const port = process.env.PORT || 5000;
const app = express();

// const corsOptions = {
//   origin: [
//     "http://localhost:5173",
//     "http://localhost:5174",
//     "https://jobquest-c5a28.web.app",
//     "https://jobquest-c5a28.firebaseapp.com",
//   ],
//   credentials: true,
//   optionsSuccessStatus: 200,
// };

const corsConfig = {
  origin: "*",
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
};
app.use(cors(corsConfig));

// app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

//verify jwt middleware
const verifyJwt = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token)
    return res.status(401).send({ message: "unAuthorized access denied" });
  if (token) {
    jwt.verify(token, process.env.SECRET_KEY, (err, decoded) => {
      if (err) {
        console.log(err);
        return res.status(401).send({ message: "un Authorized access denied" });
      } else {
        console.log(decoded);

        req.user = decoded;
        next();
      }
    });
  }
};

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.c9pict7.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

const cookieOption = {
  httpOnly: true,
  sameSite: process.env.NODE_ENV == "production" ? "none" : "strict",
  secure: process.env.NODE_ENV == "production" ? true : false,
};

async function run() {
  try {
    //Collection
    const jobsCollection = client.db("JobQuest").collection("AddJobs");
    const AppliedCollection = client.db("JobQuest").collection("AppliedJobs");

    // jwt Create
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.SECRET_KEY, {
        expiresIn: "10d",
      });
      res.cookie("token", token, cookieOption).send({ success: true });
    });
    // clear token of log out

    app.get("/logout", (req, res) => {
      res
        .clearCookie("token", {
          ...cookieOption,
          maxAge: 0,
        })
        .send({ success: true });
    });

    //Job Add Api
    app.post("/AddJobs", async (req, res) => {
      const AddJobData = req.body;
      const result = await jobsCollection.insertOne(AddJobData);
      res.send(result);
    });

    // Job Get Api
    app.get("/AddJobs", async (req, res) => {
      const result = await jobsCollection.find().toArray();
      res.send(result);
    });

    //  Job Get Api by single id

    app.get("/AddJobs/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.findOne(query);
      res.send(result);
    });

    // Save Data to Database
    app.post("/AppliedJobs", async (req, res) => {
      const AppliedData = req.body;
      const result = await AppliedCollection.insertOne(AppliedData);
      const updateDoc = {
        $inc: {
          job_applicants: 1,
        },
      };
      const JobQurey = { _id: new ObjectId(AppliedData.JobId) };
      const UpdateCount = await jobsCollection.updateOne(JobQurey, updateDoc);
      console.log(UpdateCount);
      res.send(result);
    });

    // Applied Jobs Get
    app.get("/AppliedJobs", async (req, res) => {
      const { filter, user } = req.query;
      let query = {};
      if (filter)
        query = {
          ...query,
          job_category: filter,
        };
      if (user)
        query = {
          ...query,
          email: user,
        };
      const result = await AppliedCollection.find(query).toArray();
      res.send(result);
    });

    // MyJob Get By Email
    app.get("/MyJob/:email", async (req, res) => {
      // const tokenEmail = req.user.email;
      const email = req.params.email;

      // if (tokenEmail !== email) {
      //   return res.status(403).send({ message: " Forbidden access denied" });
      // }

      const query = { "buyer.email": email };
      const result = await jobsCollection.find(query).toArray();
      res.send(result);
    });

    // Job Delete Api by single id
    app.delete("/MyJobId/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await jobsCollection.deleteOne(query);
      res.send(result);
    });

    //update jod
    app.put("/MyJobId/:id", async (req, res) => {
      const id = req.params.id;
      const jobData = req.body;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          ...jobData,
        },
      };
      const result = await jobsCollection.updateOne(query, updateDoc, options);

      res.send(result);
    });

    //Search Jobs collection
    // app.get("/SearchJobs", async (req, res) => {
    //   const search = req.query.search;
    //   let query = {
    //     job_title: { $regex: search, options: "i" },
    //   };
    //   const options = {};
    //   const result = await jobsCollection.find(query, options).toArray();
    //   res.send(result);
    // });

    app.get("/SearchJobs", async (req, res) => {
      const search = req.query.search;

      if (typeof search !== "string") {
        return res.status(400).send("Search parameter is missing or invalid.");
      }
      let query = {
        job_title: { $regex: search, $options: "i" }, // changed 'options' to '$options'
      };
      const options = {};
      const result = await jobsCollection.find(query, options).toArray();
      res.send(result);
    });

    //Search Jobs collection by single id

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello World!");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
