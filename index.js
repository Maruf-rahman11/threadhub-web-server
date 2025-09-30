
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const admin = require("firebase-admin");


dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const stripe = require('stripe')(process.env.PAYMENT_GATEWAY_KEY);


const serviceAccount = require("./firebase_admin_sdk.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});





const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.k7yk1rn.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        app.get("/", (req, res) => {
            res.send("API is running...");
        });


        const postsCollection = client.db("threadHubDB").collection("posts");
        const usersCollection = client.db("threadHubDB").collection("users");
        const announcementsCollection = client.db("threadHubDB").collection("announcements");



        // custom middlewares
        const verifyFBToken = async (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (!authHeader) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = authHeader.split(' ')[1];
            if (!token) {
                return res.status(401).send({ message: 'unauthorized access' })
            }

            // verify the token
            try {
                const decoded = await admin.auth().verifyIdToken(token);
                req.decoded = decoded;
                next();
            }
            catch (error) {
                return res.status(403).send({ message: 'forbidden access' })
            }
        }

         // ----------------------
// Voting & Comments (by _id)
// ----------------------
 // Upvote
app.patch("/posts/upvote/:id", async (req, res) => {
    const { id } = req.params;
  
    // Validate ID
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid post ID" });
    }
  
    try {
      const updatedPost = await postsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { upVote: 1 } },
        { returnDocument: "after" }
      );
  
    //   if (!updatedPost.value) return res.status(404).send({ message: "Post not found" });
  
      res.send(updatedPost.value);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Server error" });
    }
  });
  
  // Downvote
  app.patch("/posts/downvote/:id", async (req, res) => {
    const { id } = req.params;
  
    if (!ObjectId.isValid(id)) {
      return res.status(400).send({ message: "Invalid post ID" });
    }
  
    try {
      const updatedPost = await postsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $inc: { downVote: 1 } },
        { returnDocument: "after" }
      );
  
    //   if (!updatedPost.value) return res.status(404).send({ message: "Post not found" });
  
      res.send(updatedPost.value);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Server error" });
    }
  });
  
  app.post("/posts/comment/:id", async (req, res) => {
    const { id } = req.params;
    const { comment } = req.body;
  
    if (!comment || !comment.trim()) {
      return res.status(400).send({ message: "Comment cannot be empty" });
    }
  
    try {
      const updatedPost = await postsCollection.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $push: { comments: comment } },
        { returnDocument: "after" }
      );
    //   if (!updatedPost.value) return res.status(404).send({ message: "Post not found" });
      res.send(updatedPost.value);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Server error" });
    }
  });

  app.post("/create-payment-intent", async (req, res) => {
    const { amount, currency = "usd" } = req.body; // amount in cents
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount,
        currency,
        payment_method_types: ["card"],
      });
      res.send({ clientSecret: paymentIntent.client_secret });
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: "PaymentIntent creation failed" });
    }
  });
  app.post("/announcements", async (req, res) => {
    const { title, message, createdBy } = req.body;
  
    if (!title || !message || !createdBy) {
      return res.status(400).send({ message: "All fields are required" });
    }
  
    try {
      const newAnnouncement = {
        title,
        message,
        createdBy,
        created_at: new Date(),
      };
  
      const result = await announcementsCollection.insertOne(newAnnouncement);
      res.send({ insertedId: result.insertedId });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error creating announcement" });
    }
  });
  app.patch("/users/update-status/:email", async (req, res) => {
    const email = req.params.email;
    const { status } = req.body;
  
    try {
      const result = await usersCollection.updateOne(
        { email },
        { $set: { status } }
      );
  
      res.send(result);
    } catch (err) {
      console.error(err);
      res.status(500).send({ error: "Failed to update user status" });
    }
  });
  app.get("/", (req, res) => res.send("Server is running"));
  
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
  
  // ----------------------
  // Fetch by ID (single post)
  // ----------------------
  app.get("/posts/id/:id", async (req, res) => {
    const { id } = req.params;
    console.log(id)
    try {
      const post = await postsCollection.findOne({ _id: new ObjectId(id) });
      if (!post) return res.status(404).send({ message: "Post not found" });
      res.send(post);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Server error" });
    }
  });
  // Add this inside your `run()` function after defining `postsCollection`

app.post("/posts", async (req, res) => {
    const {
      authorImage,
      authorName,
      authorEmail,
      title,
      description,
      tag,
      upVote = 0,
      downVote = 0,
    } = req.body;
  
    // Validate required fields
    if (!authorImage || !authorName || !authorEmail || !title || !description || !tag) {
      return res.status(400).send({ message: "All fields are required" });
    }
  
    try {
      const newPost = {
        authorImage,
        authorName,
        authorEmail,
        title,
        description,
        tag,
        upVote,
        downVote,
        comments: [],            // initialize comments
        created_at: new Date(),  // timestamp
      };
  
      const result = await postsCollection.insertOne(newPost);
  
      res.send({ insertedId: result.insertedId });
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error adding post" });
    }
  });
  
  
  // ----------------------
  // General post queries
  // ----------------------
  app.get("/announcements", async (req, res) => {
    try {
      const announcements = await announcementsCollection
        .find({})
        .sort({ created_at: -1 }) // newest first
        .toArray();
      res.send(announcements);
    } catch (err) {
      console.error(err);
      res.status(500).send({ message: "Error fetching announcements" });
    }
  });
  app.get("/posts", async (req, res) => {
    try {
      const page = parseInt(req.query.page) || 1;
      const limit = 5;
      const tag = req.query.tag || null;
      const sortByPopularity = req.query.sortByPopularity === "true";
  
      const matchStage = tag ? { $match: { tag } } : { $match: {} };
  
      const addFieldsStage = {
        $addFields: {
          votes: { $subtract: ["$upVote", "$downVote"] }, // popularity score
        },
      };
  
      const sortStage = sortByPopularity
        ? { $sort: { votes: -1, created_at: -1 } } // popularity first, then newest
        : { $sort: { created_at: -1 } }; // newest first
  
      const skipStage = { $skip: (page - 1) * limit };
      const limitStage = { $limit: limit };
  
      const pipeline = [matchStage, addFieldsStage, sortStage, skipStage, limitStage];
  
      const postsCursor = postsCollection.aggregate(pipeline);
      const posts = await postsCursor.toArray();
  
      // Get total count for pagination
      const totalPosts = await postsCollection.countDocuments(tag ? { tag } : {});
      const totalPages = Math.ceil(totalPosts / limit);
  
      res.send({ posts, totalPages });
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Server Error" });
    }
  });
  
  
  // ----------------------
  // User-related routes
  // ----------------------
  app.get("/users/:email", async (req, res) => {
    const email = req.params.email;
    const user = await usersCollection.findOne({ email });
    if (!user) return res.status(404).send({ message: "User not found" });
    res.send(user);
  });
  
  // 👇 keep this LAST so it doesn’t interfere with `:id` routes
  app.get("/posts/:email", async (req, res) => {
    const email = req.params.email;
    console.log(email)
    try {
      const userPosts = await postsCollection.find({ authorEmail: email }).toArray();
      if (userPosts.length === 0) return res.status(404).send({ message: "User not found" });
      res.send(userPosts);
    } catch (error) {
      console.error(error);
      res.status(500).send({ message: "Server error" });
    }
  });
       




        // // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
