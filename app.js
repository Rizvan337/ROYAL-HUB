const express = require("express")
const path = require('path')
const dotenv = require('dotenv')
const session = require('express-session')
dotenv.config();
const db = require('./config/db')
const userRouter = require('./routes/userRouter')
const passport = require('./config/passport')
const adminRouter = require('./routes/adminRouter')
db();
const http = require('http')
const app = express()
const server = http.createServer(app);
const socketIo = require('socket.io');
const io = socketIo(server);
const flash = require('connect-flash');


app.use(express.json())
app.use(express.urlencoded({extended:true}))

app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
        secure:false,
        httpOnly:true,
        maxAge:72*60*60*1000
    }
}))

app.use(passport.initialize())
app.use(passport.session())

app.use(flash());

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next();
})

app.set('view engine', 'ejs')
app.set("views", [path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
app.use(express.static(path.join(__dirname,"public")));


app.use('/',userRouter);
app.use('/admin',adminRouter)

app.use((req, res, next) => {
    req.io = io;
    next();
  });
  
  io.on('connection', (socket) => {
    console.log('A user connected');
    socket.on('disconnect', () => {
      console.log('A user disconnected');
    });
  });

app.listen(process.env.PORT,()=>{
    console.log("Server Running on:http://localhost:4000");
    
})

module.exports = app;