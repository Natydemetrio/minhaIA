// const express = require('express');
// const mongoose = require('mongoose');

// const app = express();
// const port = 3000;
// const uri = "mongodb+srv://nathaly:06062007@iahistoriador.muxslkg.mongodb.net/?retryWrites=true&w=majority&appName=IAHistoriador";

// mongoose.connect(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
// .then(() => console.log('Conectado ao MongoDB'))
// .catch(err => console.error(err)); 



// // Iniciando o servidor
// app.listen(port, () => {
//   console.log(`Servidor rodando na porta ${port}`);
// });

const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3000;

// Conectar ao MongoDB (URI fornecido por você)
const uri = "mongodb+srv://nathaly:06062007@iahistoriador.muxslkg.mongodb.net/dadosIA?retryWrites=true&w=majority&appName=IAHistoriador";
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error(err));

// Middleware
app.use(bodyParser.json());
app.use(cors());

// Criar o schema e o model para armazenar as perguntas
const perguntaSchema = new mongoose.Schema({
  pergunta: String,
  resposta: String,
  timestamp: { type: Date, default: Date.now }
});

const Pergunta = mongoose.model('Pergunta', perguntaSchema);

// Rota para salvar perguntas e respostas
app.post('/messages', async (req, res) => {
  const { pergunta, resposta } = req.body;
  try {
    const novaPergunta = new Pergunta({ pergunta, resposta });
    await novaPergunta.save();
    res.status(201).send('Pergunta salva com sucesso');
  } catch (error) {
    res.status(500).send('Erro ao salvar pergunta');
  }
});

// Rota para listar perguntas
app.get('/messages', async (req, res) => {
  try {
    const perguntas = await Pergunta.find();
    res.status(200).json(perguntas);
  } catch (error) {
    res.status(500).send('Erro ao carregar perguntas');
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
