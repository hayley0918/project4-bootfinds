if(process.env.NODE_ENV !== 'production'){
    require('dotenv').config()
}

const { createUser, getUserById, getUserByEmail } = require('./models/user')
const { createItemPost, findOneItemById, getAllItems, findItemsFromUser, updateItem, deleteItem } = require('./models/item')

const express = require("express")
const app = express()
const cors = require('cors')
const pool = require('./db')
const bcrypt = require('bcrypt')
const passport = require('passport')
const flash = require('express-flash')
const session = require('express-session')
const methodOverride = require('method-override')
const axios = require('axios')
// const partials = require('express-partials');
// const expressLayouts = require('express-ejs-layouts')

const initializePassport = require('./passport-config')
initializePassport(
  passport,
  getUserByEmail,
  getUserById
)

app.set('view-engine', 'ejs')
// app.use(partials())
app.use(express.static('public'))
app.use(express.urlencoded({ extended: false }))
app.use(flash())
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
app.use(methodOverride('_method'))
// app.use(expressLayouts)

// middleware
app.use(cors())
app.use(express.json())

// Routes
app.get('/', checkAuthenticated, (req, res) => {
    res.render('index.ejs', { user: req.user })
})

app.get('/users', async (req, res)=>{
    const result = await getUserById(1)
    res.json(result.rows[0].id)
})

// create account
app.get('/signup', checkNotAuthenticated, (req, res) => {
    res.render('signup.ejs')
})

app.post('/signup', checkNotAuthenticated, async (req, res) => {
    try {
      const hashedPassword = await bcrypt.hash(req.body.password, 10)
      await createUser({
        username: req.body.username,
        email: req.body.email,
        digested_password: hashedPassword,
        st_number: req.body.st_number,
        address_street: req.body.address_street,
        address_suburb: req.body.address_suburb,
        address_state: req.body.address_state,
        postcode: req.body.postcode
      })
      res.redirect('/login')
    } catch {
      res.redirect('/signup')
    }
})

// login

app.get('/login', checkNotAuthenticated, (req, res) => {
    res.render('login.ejs')
})

app.post('/login', checkNotAuthenticated, passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login',
    failureFlash: true
}))

// get all Items
app.get('/api/items', async(req, res)=>{
    const items = await getAllItems()
    res.json(items.rows)
})

app.get('/items', async(req, res)=>{
    const items = await getAllItems()
    res.json(items.rows)
})

// show all the items
app.get('/show', async (req, res)=>{
    const items = await axios.get('http://localhost:5000/api/items').then(res => res.data)
    res.render('show.ejs', {items: items})
})


app.get('/post', (req, res)=>{
    res.render('post.ejs') 
})

// create item
app.post('/post', async(req, res)=>{
    try {
        await createItemPost({
          item_name: req.body.item_name,
          item_type: req.body.item_type,
          quantity: req.body.quantity,
          price: req.body.price,
          image_url: req.body.image_url,
          item_detail: req.body.item_detail
        })
        res.redirect('/')
      } catch {
        res.redirect('/post')
      }
})

// ******* get my posts
app.get("/api/myposts", async(req, res)=>{
    try{
        const myPosts = await findItemsFromUser(req.user.id)
        res.json(myPosts.rows)
    }catch(err){
        console.error(err.message)
    }
})

app.get("/myposts", async(req, res)=>{
    const items = await axios.get('http://localhost:5000/api/myposts').then(dbRes => console.log(dbRes.data))
    res.render('myposts.ejs', {items: items})
})

// get one item by item id
app.get("/api/items/:id", async(req, res)=>{
    try{
        const {id} = req.params
        const item = await findOneItemById(id)

        res.json(item.rows[0])
    }catch(err){
        console.log(err.message)
    }
})

app.get("/items/:id", async(req, res)=>{
    const item = await axios.get('http://localhost:5000//api/items/:id').then(res => console.log(res))
    res.render('item.ejs', { item: item })
})

// **** update item

app.get('/update', (req, res)=>{
    res.render('update.ejs')
})

app.put('/items/:id', async (req, res) => {
    try{
        const { id } = req.params
        const { item_name, item_type, quantity, price, image_url, item_detail } = req.body
        await updateItem(req.body)
        res.json("updated successfully")
    }catch(err){
        console.error(err.essage)
    }
})



// delete item
app.delete("/items/:id", async(req, res)=>{
    try{
        const {id} = req.params
        const deleteItem = await deleteItem(id)
        res.json('item is deleted')
    }catch (err){
        console.log(err.message)
    }
})



// logout
app.delete('/logout', (req, res)=>{
    req.logOut()
    res.redirect('/login')
})


function checkAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return next()
    }

    res.redirect('/login')
}

function checkNotAuthenticated(req, res, next){
    if(req.isAuthenticated()){
        return res.redirect('/')
    }
    next()
}


app.listen(5000, ()=>{
    console.log("server has started on port 5000")
})