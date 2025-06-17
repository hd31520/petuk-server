const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());






const uri = "mongodb+srv://petuk_server:FIMTVcKmhKBlycaD@cluster0.v2f3c.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

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
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

 const database = client.db('petuk_dbcollection');
    const topsell = database.collection('top_sell');


app.get('/top-food', async (req, res) => {
   const result = await topsell.find().toArray();
   res.send(result)
})

app.get('/foods/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const query = { _id:(id) };
        const result = await topsell.findOne(query);
        console.log(id)
        if (result) {
            console.log(result);
            res.status(200).json(result);
        } else {
            console.log('No document found');
            res.status(404).send('Document not found');
        }
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Internal Server Error');
    }
});


    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    
  }
}
run().catch(console.dir);




app.get("/", (req, res) => {
  res.send(" Server is running...");
});

app.listen(port, () => {
  console.log(` Server running at ${port}`);
});
