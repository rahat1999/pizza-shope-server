const express = require('express')
const cors = require('cors')
const ObjectId = require('mongodb').ObjectId;
const { MongoClient } = require('mongodb');
require('dotenv').config()
const app = express()
const fileUpload = require('express-fileupload');
const e = require('express');
const req = require('express/lib/request');
const stripe = require("stripe")(process.env.STRIPE_SECRET)

const port = process.env.PORT || 8000;

/*========= Middleware============== */
app.use(cors());
app.use(express.json());
app.use(fileUpload());

/* ===========MongoDb================ */
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.2rvjh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

// console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();
        const database = client.db("skyLinePizzaDB");
        const foodsCollection = database.collection("allFoods");
        const ordersCollection = database.collection("orders");
        const coustomerReviewCollection = database.collection("review");
        const usersCollection = database.collection("users");

        /* post  food */
        app.post('/addProducts', async (req, res) => {
            const foodName = req.body.foodName;
            const price = req.body.price;
            const discription = req.body.discription;
            const catagory = req.body.catagory;
            const picData = req.files.image.data;
            const encodedPic = picData.toString('base64')
            const imageBuffer = Buffer.from(encodedPic, 'base64')
            // const image = imageBuffer;
            const result = await foodsCollection.insertOne({ foodName, price, discription, catagory, image: imageBuffer })
            // console.log(result);
            res.send(result)
        })

        /* ============= get food ============== */
        app.get('/allProducts', async (req, res) => {
            const result = await foodsCollection.find({}).toArray()
            // console.log(result);
            res.send(result)
        })

        /* ===== get id based products ======== */
        app.get('/orderProduct/:id', async (req, res) => {
            const query = { _id: ObjectId(req.params.id) }
            const result = await foodsCollection.findOne(query)
            res.send(result)
        })

        /* ====== coustomerOrders ===========*/
        app.post('/orders', async (req, res) => {
            const result = await ordersCollection.insertOne(req.body);
            res.send(result)
        })


        app.get('/userOrder', async (req, res) => {
            const email = req.query.email;
            const result = await ordersCollection.find({ email: email }).toArray()
            res.send(result)
        })

        app.get('/allOrders', async (req, res) => {
            const result = await ordersCollection.find({}).toArray()
            res.json(result)
        })

        /* ======PAYMENT Gateway =======*/
        app.put('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const payment = req.body;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    payment: payment,
                }
            }
            const result = await ordersCollection.updateOne(filter, updateDoc)
            res.json(result);
        })


        app.get('/orders/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const result = await ordersCollection.findOne(query);
            res.json(result)
        })
        app.post("/create-payment-intent", async (req, res) => {
            const paymentInfo = req.body;
            const amount = paymentInfo.price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ['card'],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        /* ====== user review POST API ======== */
        app.post('/coustomerReview', async (req, res) => {
            const result = await coustomerReviewCollection.insertOne(req.body);
            res.send(result)
        })
        app.get('/coustomerReview', async (req, res) => {
            const result = await coustomerReviewCollection.find({}).toArray()
            res.send(result)
        })
        /* ========= Find Admin */
        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin })
        })

        /* ==User data Post api for save user email,name in db=== */
        app.post('/users', async (req, res) => {
            const result = await usersCollection.insertOne(req.body)
            res.send(result)
            // console.log(result);

        })
        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            // console.log(result);
            res.json(result);
        })
        app.put('/users/admin', async (req, res) => {
            const user = req.body;
            // console.log('put', user)
            const filter = { email: user.email };
            const updateDoc = { $set: { role: 'admin' } };
            const result = await usersCollection.updateOne(filter, updateDoc,)
            res.json(result)
        })



    } finally {
        //   await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('welcome Skyline pizza !')
})

app.listen(port, () => {
    console.log(`listening at :${port}`)
})
