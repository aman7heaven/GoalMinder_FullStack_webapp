const mongoose=require('mongoose');
const user = require('./user');
const Schema=mongoose.Schema;

const GoalsSchema=new Schema({
    goal:{
       type: String,
       required:[true, 'please add a goal']
    },

    date:{
        type: String,
    },
    
    time:{
      type: String,
    },

    currdate:{
      type:String
    },

    currtime:{
      type:String
    },

    author:{
      type:Schema.Types.ObjectId,
      ref:'Usergoal'
    }

})

module.exports=mongoose.model('Goals',GoalsSchema);