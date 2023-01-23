
const mongoose=require('mongoose');
const Goals=require('../models/goals');
const seedgoals=require('./seeds');


//Connecting to database
mongoose.connect('mongodb+srv://aman7heaven:27january@learn.v9ypdak.mongodb.net/?retryWrites=true&w=majority')
.then(()=>{
    console.log("CONNECTION OPEN!!!");
})
.catch(err=>{
    console.log("OH NO ERROR!!")
    console.log(err);
});

const seedDB= async() =>{

    for(let i=0;i<5;i++){
    const temp=new Goals({goal: `${seedgoals[i].goal}`});
    await temp.save();
    }
    
}

seedDB().then(()=>{
    mongoose.connection.close();
})