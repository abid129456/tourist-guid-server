const express = require('express');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = process.env.MONGODB_URI || "mongodb+srv://tourGiude:ifxlFNqEsmlZjB1W@cluster0.zhani17.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});


const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).send({ error: 'Unauthorized access: No token provided' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err)
      return res.status(403).send({ error: 'Forbidden access: Invalid token' });

    req.decoded = decoded;
    next();
  });
};

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB");

    const database = client.db("tourGuideDB");
    const bookingsCollection = database.collection("bookings");
    const tourGuidesCollection = database.collection("tourGuides");
    const usersCollection = database.collection("users");

    
    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "2h",
      });
      res.send({ token });
    });

 

    app.post('/users', async (req, res) => {
      const user = req.body;
      if (!user.email) return res.status(400).send({ error: "Email required" });

      try {
        const existingUser = await usersCollection.findOne({ email: user.email });
        if (existingUser) {
          const result = await usersCollection.updateOne(
            { email: user.email },
            { $set: user }
          );
          return res.send({ message: "User updated", result });
        } else {
          const result = await usersCollection.insertOne(user);
          return res.send({ message: "User created", result });
        }
      } catch (error) {
        return res.status(500).send({ error: "Failed to save user" });
      }
    });


    app.get('/users/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      try {
        const user = await usersCollection.findOne({ email: email });
        if (!user) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send(user);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch user role" });
      }
    });


    app.patch('/users/role/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const newRole = req.body.role;



      try {
        const result = await usersCollection.updateOne(
          { email },
          { $set: { role: newRole } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to update role' });
      }
    });


    app.post('/bookings', verifyToken, async (req, res) => {
      const booking = req.body;
      try {
        const result = await bookingsCollection.insertOne(booking);
        res.send(result);
      } catch (error) {
        console.error('Booking Error:', error.message);
        res.status(500).send({ error: 'Failed to save booking' });
      }
    });

    app.get('/bookings', verifyToken, async (req, res) => {
      const email = req.query.email;
      try {
        const query = email ? { email } : {};
        const bookings = await bookingsCollection.find(query).toArray();
        res.send(bookings);
      } catch (error) {
        console.error("Error fetching bookings:", error);
        res.status(500).send({ error: "Failed to fetch bookings" });
      }
    });

    app.post('/tour-guides', verifyToken, async (req, res) => {
      const newGuide = req.body;
      try {
        const result = await tourGuidesCollection.insertOne(newGuide);
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: 'Failed to add tour guide' });
      }
    });

    app.get('/tour-guides', async (req, res) => {
      try {
        const guides = await tourGuidesCollection.find().toArray();
        res.send(guides);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch guides" });
      }
    });


    app.get('/tour-guides/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const guide = await tourGuidesCollection.findOne({ _id: new ObjectId(id) });
        if (!guide) return res.status(404).send({ message: "Guide not found" });
        res.send(guide);
      } catch (error) {
        res.status(500).send({ error: "Failed to fetch guide" });
      }
    });


    app.patch('/tour-guides/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const updates = req.body;
      try {
        const result = await tourGuidesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updates }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to update guide" });
      }
    });


    app.delete('/tour-guides/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await tourGuidesCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to delete guide" });
      }
    });


    app.patch('/guides/approve/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      try {
        const result = await tourGuidesCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "approved" } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ error: "Failed to approve guide" });
      }
    });


    app.get('/', (req, res) => {
      res.send("Server is running 🟢");
    });

  } catch (error) {
    console.error(' MongoDB connection error:', error);
  }
}

run().catch(console.dir);


app.listen(port, () => {
  console.log(` Server running on port ${port}`);
});
