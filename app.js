if(process.env.NODE_ENV!=="production"){
    require('dotenv').config();
}


const express=require('express');
const mongoose=require('mongoose');
const Goals=require('./models/goals');
const methodOverride=require('method-override');
const ejsMate=require('ejs-mate');
const passport=require('passport');
const LocalStrategy=require('passport-local');
const User=require('./models/user');
const session=require('express-session');
const flash=require("connect-flash");
const catchAsync=require('./errors/catchAsync');
const ExpressError=require('./errors/ExpressError');
const joi=require('joi');
const {isLoggedIn}=require('./isloggedin');
const nodemailer=require('nodemailer');
const mongoSanitize=require('express-mongo-sanitize');
const MongoDBStore=require('connect-mongo')(session);



const app=express();


//Connecting to database
mongoose.connect(`mongodb+srv://aman7heaven:${process.env.SECRET}learn.v9ypdak.mongodb.net/?retryWrites=true&w=majority`)
.then(()=>{
    console.log("CONNECTION OPEN!!!");
})
.catch(err=>{
    console.log("OH NO ERROR!!")
    console.log(err);
})




//PASSPORT AND SESSION

const secret=process.env.SECRET || "thisshouldbeasecret!";

const store=new MongoDBStore({
    url:`mongodb+srv://aman7heaven:${process.env.SECRET}learn.v9ypdak.mongodb.net/?retryWrites=true&w=majority`,
    secret,
    touchAfter: 24*3600
})

store.on("error",function(e){
    console.log("session store error",e);
})

const sessionConfig={
    store,
    name:'session',
    secret:'thisbetterbeasecret',
    resave:false,
    saveUninitialized:true,
    cookie:{
        httpOnly:true,
        expires: Date.now()+1000*60*60*24*7,
        maxAge:1000*60*60*24*7
    }
}
app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



//FLASH and a middleware of FLASH
app.use(flash());
app.use((req,res,next)=>{
    res.locals.currentUser=req.user;
    res.locals.success=req.flash('success')
    res.locals.error=req.flash('error');
    next();
})


//EJS
app.engine('ejs',ejsMate);
app.set('view engine','ejs');
app.use(express.static('public'));



//EXPRESS
app.use(express.urlencoded({extended : true}));
app.use(methodOverride('_method'));
app.use(mongoSanitize());



//PORT
app.listen(3000,()=>{{
    console.log("LISTENING ON PORT 3000!");
}})




//JOI validation

const validateGoal=(req,res,next)=>{

    const goalschema = joi.object().keys({
        goal: joi.string().required(),
        date: joi.string().required(),
        time: joi.string().required()
    })
    
    const{error}=goalschema.validate(req.body);
    
    if(error){
        const msg=error.details.map(el=>el.message).join(',')
        throw new ExpressError(msg,400);
    }else{
        next();
    }
    
    }




//routes






//Landing page
app.get('/',(req,res)=>{
    res.render('main');
})



//Show all goals page
app.get('/goals',isLoggedIn,catchAsync(async(req,res)=>{
    const goals=await Goals.find({});
    
    res.render('home',{goals});
}))



//opens a new page when we click on goal and edit it
app.get('/goals/:id',isLoggedIn,catchAsync(async(req,res)=>{
    const goal=await Goals.findById(req.params.id);
    if(!goal){
        req.flash('error',"Cannot find that goal");
         return res.redirect('/goals');
       }

       if(!goal.author._id.equals(req.user._id)){
           req.flash('error','You do not have permission to do that');
           return res.redirect('/goals');
       }  
    res.render('editGoal',{goal});
}))



//form on home page to create goals
app.post('/creategoals',isLoggedIn,validateGoal, catchAsync(async(req,res)=>{
     const goal=new Goals(req.body);
     goal.author=req.user._id;
    
     const now = new Date();
     const date = now.toLocaleDateString();
     const time = now.toLocaleTimeString();
     goal.currtime=`${time}`;
     goal.currdate= `${date}`;
    // await Goals.findOneAndUpdate(goal._id,{currdate:,currtime:});
     await goal.save();
     req.flash('success',"Successfully added a new goal!");
     res.redirect('/goals');
}))



//update the goal
app.put('/updategoals/:id',isLoggedIn,catchAsync(async(req,res)=>{
   const{id}=req.params;
   const goal=await Goals.findById(id);
   if(!goal.author._id.equals(req.user._id)){
       req.flash('error','You do not have permission to do that');
       return res.redirect('/goals');
   }
   const goals= await Goals.findByIdAndUpdate(id,{...req.body.new});
   req.flash('success',"Successfully updated the goal!");
   res.redirect('/goals');
}))



//Delete a goal

app.delete('/goals/:id',isLoggedIn,catchAsync(async(req,res)=>{
    const{id}=req.params;
    const goal=await Goals.findById(id);
    if(!goal.author._id.equals(req.user._id)){
        req.flash('error','You do not have permission to do that');
        return res.redirect('/goals');
    }
    await Goals.findByIdAndDelete(id);
    req.flash('success',"Successfully deleted the goal!");
    res.redirect('/goals');
}))


//Authentication



app.get('/register',(req,res)=>{
    res.render('register');
})

app.post('/register',catchAsync(async(req,res,next)=>{
    try{
    const {email,username,password}=req.body;
    const newuser=new User({email,username});
    const registereduser=await User.register(newuser,password);
    req.login(registereduser,err=>{
        if(err)return next(err);
        req.flash("success","Welcome to GoalMinder!");
        res.redirect('/goals');
    })
    }catch(e){
        req.flash('error',e.message);
        res.redirect('/register');
    }

    
}))

app.get('/login',(req,res)=>{
 res.render('login');
})

app.post('/login',passport.authenticate('local',{failureFlash:true,failureRedirect:'/login'}),(req,res)=>{
req.flash('success','welcome back!');
res.redirect('/goals');
})

app.get('/logout',(req,res)=>{
    req.logout();
   // req.flash('success','Logged you out!');
    res.redirect('/');
})







//Error Handling

app.all('*',(req,res,next)=>{
    next(new ExpressError('Page not found',404));
})


//Error handling
app.use((err,req,res,next)=>{
    const{statusCode=500}=err;
    if(!err.messge)err.message="OH No, Something Went wrong!";
    res.status(statusCode).render('Error',{err}); 
})




//SEND MAILS



setInterval(async()=>{


//Date
   var date=new Date();  
   var day=date.getDate();  
   var month=date.getMonth()+1;  
   var year=date.getFullYear();

const currdate=(month>10)? (year+"-"+month+"-"+day): (year+"-0"+month+"-"+day);


var today=new Date();  
var h=today.getHours();  
var m=today.getMinutes();  
var s=today.getSeconds(); 

 h=(h<10)?('0'+h):(h);
 m=(m<10)?('0'+m):(m);

 const currtime=(h+":"+m);

   const cursor = Goals.find().cursor();
   for (let goal = await cursor.next(); goal != null; goal = await cursor.next()) {

       if(goal.date==currdate && goal.time==currtime){
        
        const userId=goal.author._id;
        const remindergoal=goal.goal;
        const reciever=await User.findById(userId);
        const recievermail=reciever.email;
    
      let transporter=nodemailer.createTransport({
      service:'gmail',
       auth:{
        user:`${process.env.EMAIL}`,
        pass:`${process.env.PASS}`
        }
      });

      let mailoptions={
        from:`${process.env.EMAIL}`,
        to:`${recievermail}`,
        subject:' Reminder from GoalMinder',
        text:`This is a friendly reminder from GoalMinder,to keep you on track with your goal. We believe in you and your ability to achieve it. Remember, progress is made one step at a time. Keep pushing forward and don't give up on your goal.
              Your Reminder-${remindergoal}`,
     };

     const info=await transporter.sendMail(mailoptions,(error, info) => {
        if (error) console.log(error);
        else console.log('Email sent: ' + info.response);
     }) 
     
        
    }
   }
   
},60000);



 





