const express = require('express');
const mongoose = require('mongoose');

const app = express();
const port = 3000;
const uri = "mongodb+srv://nathaly:06062007@iahistoriador.muxslkg.mongodb.net/?retryWrites=true&w=majority&appName=IAHistoriador";

mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('Conectado ao MongoDB'))
.catch(err => console.error(err));   


// Definição do esquema (modelo)
// const userSchema = new mongoose.Schema({
//   name: String,
//   age: Number
// });

// const User = mongoose.model('User', userSchema);

// Rota para criar um novo usuário
app.post('/users', async (req, res) => {
  const { name, age } = req.body;
  const user = new User({ name, age });
  await user.save();
  res.json(user);
});

// Iniciando o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});


// const connectToMongo = async () => {
//   try {
//     const mongoUri = process.env.MONGODB_URI;
//     await mongoose.connect(mongoUri, {
//       useNewUrlParser: true,
//       useUnifiedTopology: true,
//     });
//     console.log('Connected to MongoDB Atlas!');
//   } catch (error) {
//     console.error('Error connecting to MongoDB Atlas:', error);
//     process.exit(1); // Exit the application on connection failure
//   }
// };

// // Call the connectToMongo function to establish the connection
// connectToMongo();

// const messageSchema = new mongoose.Schema({
//   role: String,
//   text: String,
// });

// const Message = mongoose.model('Message', messageSchema);

// // Example usage for messages:
// async function saveMessage(message) {
//   const newMessage = new Message(message);
//   await newMessage.save();
// }

// async function getMessages() {
//   const messages = await Message.find({});
//   return messages;
// }
