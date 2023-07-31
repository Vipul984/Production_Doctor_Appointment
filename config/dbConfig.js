const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URL);

const connection = mongoose.connection;


connection.on('connected', () => {
    console.log('Mongodb is connected');
})

connection.on('error', (error) => {
    console.log('error connecting db', error);
})
module.exprt = mongoose;