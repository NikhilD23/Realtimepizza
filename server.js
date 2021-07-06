require ('dotenv').config()
const express = require('express')
const app = express()
const ejs = require('ejs')
const expressLayout = require('express-ejs-layouts')
const path = require('path')
const PORT = process.env.PORT || 3300
const mongoose = require('mongoose')
const session = require('express-session')
const flash = require('express-flash')
const MongoDbStore = require('connect-mongo')
const passport = require('passport')
const Emitter = require('events')



// Database connection
//mongodb://superAdmin:secret@localhost:27017/pizza?authSource=admin&w=1
 
mongoose.connect(process.env.MONGO_CONNECTION_URL, {useNewUrlParser: true, useCreateIndex:true, useUnifiedTopology:true, useFindAndModify: true});
const connection = mongoose.connection;

connection.once('open', () => {
    console.log('Database connected...');
}).catch(err => {
    console.log('Connection failed...')
});



app.use(flash())
//Assests
app.use(express.static('public'))
app.use(express.urlencoded({extended: false }))
app.use(express.json())





//set template engine
app.use(expressLayout)

app.set('views', path.join(__dirname, '/resources/views'))
app.set('view engine', 'ejs')

// //Session store
// let mongoStore = new MongoDbStore({

//                 mongooseConnection: connection,
//                 collection: 'sessions'


// })




//Session config
app.use(session({
    secret: process.env.COOKIE_SECRET,
    resave: false,
    store: MongoDbStore.create({
        client: connection.getClient()
         
    }),
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 *24 } //24 hours
}))

//Event emitter
const eventEmitter = new Emitter()
app.set('eventEmitter', eventEmitter)




//Passport config
const passportInit = require('./app/config/passport')
passportInit(passport)
app.use(passport.initialize())
app.use(passport.session())


//Global Middleware
app.use((req, res, next) =>{
    res.locals.session = req.session
    res.locals.user = req.user
    next()
})




require('./routes/web')(app)
app.use((req, res) => {
    res.status(404).send('<h1>404, Page not found</h1>')
})

const server = app.listen(PORT , () => {
    console.log(`Listening on port ${PORT}`)
})

//Socket

const io = require('socket.io')(server)
io.on('connection', (socket)=>{
    //Join 
    socket.on('join', (orderId) =>{
        socket.join(orderId)
    })
})

eventEmitter.on('orderUpdated', (data) =>{
    io.to(`order_${data.id}`).emit('orderUpdated', data)

})


//Admin mai order aaye realtime uske lie hamne jo orderController.js(\customers wala) mai event banaya hai usko yahan se emit karenge and then admin.js mai listen karenge
eventEmitter.on('orderPlaced', (data)=>{
    io.to('adminRoom').emit('orderPlaced', data)
}) 



 


