const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const requestIp = require('request-ip');
const https = require('https');

const app = express();
const port = 3000;

// Configura o Express para confiar nos proxies
app.set('trust proxy', true);

// Conectar ao MongoDB
const uri = "mongodb+srv://nathaly:06062007@iahistoriador.muxslkg.mongodb.net/dadosIA?retryWrites=true&w=majority&appName=IAHistoriador";
mongoose.connect(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
  .then(() => console.log('Conectado ao MongoDB'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(requestIp.mw());

// Criar o schema e o model para armazenar as perguntas
const perguntaSchema = new mongoose.Schema({
  pergunta: String,
  resposta: String,
  timestamp: { type: Date, default: Date.now }
});

const Pergunta = mongoose.model('Pergunta', perguntaSchema);

// Criar o schema e o model para registrar os acessos
const acessoSchema = new mongoose.Schema({
  ip: String,
  local: String,
  horario: { type: Date, default: Date.now },
  servidor: String
});

const Acesso = mongoose.model('Acesso', acessoSchema);

// Função para obter o IP usando o serviço externo
const obterIpExterno = () => {
  return new Promise((resolve, reject) => {
    https.get('https://api.ipify.org?format=json', (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (data.trim() === '') {
            reject('Resposta vazia recebida do serviço de IP');
            return;
          }

          const json = JSON.parse(data);
          if (json.ip) {
            resolve(json.ip);
          } else {
            reject('IP não encontrado na resposta');
          }
        } catch (error) {
          reject('Erro ao processar a resposta JSON: ' + error.message);
        }
      });
    }).on('error', (error) => {
      reject('Erro ao fazer a requisição: ' + error.message);
    });
  });
};

// Função para obter a localização com base no IP
const obterLocalizacao = (ip) => {
  return new Promise((resolve, reject) => {
    https.get(`https://geolocation-db.com/json/${ip}&position=true`, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (data.trim() === '') {
            resolve('Localização desconhecida');
            return;
          }

          const json = JSON.parse(data);
          if (json.city && json.state && json.country_name) {
            resolve(`${json.city}, ${json.state}, ${json.country_name}`);
          } else {
            resolve('Localização desconhecida');
          }
        } catch (error) {
          reject('Erro ao processar a resposta JSON: ' + error.message);
        }
      });
    }).on('error', (error) => {
      reject('Erro ao fazer a requisição: ' + error.message);
    });
  });
};

// Middleware para registrar o acesso com todos os dados (IP, localização, servidor)
app.use(async (req, res, next) => {
  let ip = req.clientIp || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const servidor = req.hostname || 'Desconhecido';

  // Obtendo o IP do cliente usando o serviço externo
  try {
    ip = await obterIpExterno(); // Usa o IP obtido do serviço externo
  } catch (error) {
    console.error('Erro ao obter IP externo:', error);
  }

  // Obtendo a localização com base no IP
  let local = 'Localização desconhecida';

  try {
    local = await obterLocalizacao(ip);
  } catch (error) {
    console.error('Erro ao obter localização:', error);
  }

  // Cria o registro de acesso com IP, localização e servidor
  const novoAcesso = new Acesso({
    ip: ip,
    local: local,
    servidor: servidor
  });

  try {
    await novoAcesso.save();
    console.log('Acesso registrado com sucesso');
  } catch (error) {
    console.error('Erro ao registrar acesso:', error);
  }

  next();
});

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

// Rota para listar os acessos
app.get('/acessos', async (req, res) => {
  try {
    const acessos = await Acesso.find();
    res.status(200).json(acessos);
  } catch (error) {
    res.status(500).send('Erro ao carregar acessos');
  }
});

// Iniciar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
});
