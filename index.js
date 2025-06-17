const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

const uri = `${process.env.URI}`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const database = client.db("petuk_dbcollection");
    const topsell = database.collection("top_sell");
    const cartdb = database.collection("cartdb");

    // --- All Routes Should Be Defined Here, After DB Connection ---

    // Root route
    app.get("/", (req, res) => {
      res.send("Server is running...");
    });

    // Product Routes
    app.get("/top-food", async (req, res) => {
      const result = await topsell.find().toArray();
      res.send(result);
    });

    app.get("/foods/:id", async (req, res) => {
      try {
        const id = req.params.id;
        const query = { _id: id };
        const result = await topsell.findOne(query);

        if (result) {
          res.status(200).json(result);
        } else {
          res.status(404).json({ message: "Document not found" });
        }
      } catch (error) {
        console.error("Error fetching food by ID:", error);
        res.status(500).json({ message: "Internal Server Error" });
      }
    });

    // Cart Route
    app.post("/cart/add", async (req, res) => {
      try {
        const { userEmail, productId, quantity } = req.body;
        console.log(userEmail);

        if (!userEmail || !productId || !quantity) {
          return res
            .status(400)
            .json({ message: "Email, productId, and quantity are required." });
        }

        const product = await topsell.findOne({ _id: (productId) });

        if (!product) {
          return res
            .status(404)
            .json({ message: "This product is not available in our store." });
        }

        const userCart = await cartdb.findOne({ userEmail: userEmail });

        if (userCart) {
          const existingItemIndex = userCart.items.findIndex(
            (item) => item.productId.toString() === productId
          );

          if (existingItemIndex > -1) {
            await cartdb.updateOne(
              {
                userEmail: userEmail,
                "items.productId": new ObjectId(productId),
              },
              { $inc: { "items.$.quantity": 1 } } // increment by 1 or quantity from body
            );
          } else {
            await cartdb.updateOne(
              { userEmail: userEmail },
              {
                $push: {
                  items: {
                    productId: new ObjectId(productId),
                    quantity: quantity,
                    ...product,
                  },
                },
              }
            );
          }
          res.status(200).json({ message: "Cart updated successfully." });
        } else {
          await cartdb.insertOne({
            userEmail: userEmail,
            items: [
              {
                productId: new ObjectId(productId),
                quantity: quantity,
                ...product,
              },
            ],
          });
          res.status(201).json({ message: "Product added to your cart." });
        }
      } catch (error) {
        console.error("Cart Error:", error);
        res.status(500).json({ message: "A server error occurred." });
      }
    });

    // Server Health Check and Confirmation
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );

    // Start the server only after the database connection is successful
    app.listen(port, () => {
      console.log(`Server running at ${port}`);
    });
  } finally {
    // The client should not be closed here if the server is to remain running
    // await client.close();
  }
}

// Run the main function
run().catch(console.dir);
