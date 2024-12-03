const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const requestIp = require('request-ip');
const https = require('https');
require('dotenv').config(); // Para carregar variáveis de ambiente

const app = express();
const port = process.env.PORT || 3000; // Define a porta pelo ambiente ou usa a 3000

// Configura o Express para confiar nos proxies
app.set('trust proxy', true);

// Conectar ao MongoDB usando variável de ambiente
const uri = process.env.MONGODB_URI || "mongodb+srv://nathaly:06062007@iahistoriador.muxslkg.mongodb.net/dadosIA?retryWrites=true&w=majority&appName=IAHistoriador";
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

// Criar o schema e o model para armazenar o histórico de conversas
const conversaSchema = new mongoose.Schema({
  usuarioId: String,  // Pode ser o IP ou ID do usuário
  mensagens: [
    {
      texto: String,
      papel: { type: String, enum: ['usuario', 'bot'] },
      timestamp: { type: Date, default: Date.now }
    }
  ]
});

const Conversa = mongoose.model('Conversa', conversaSchema);

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

// Função para obter o histórico de conversas do usuário
const obterHistoricoConversa = async (usuarioId) => {
  try {
    const conversa = await Conversa.findOne({ usuarioId });
    return conversa ? conversa.mensagens : [];
  } catch (error) {
    console.error('Erro ao obter histórico de conversa:', error);
    return [];
  }
};

// Função para adicionar uma nova mensagem ao histórico de conversa
const atualizarHistoricoConversa = async (usuarioId, mensagem) => {
  try {
    let conversa = await Conversa.findOne({ usuarioId });

    if (!conversa) {
      conversa = new Conversa({ usuarioId, mensagens: [] });
    }

    conversa.mensagens.push(mensagem);
    await conversa.save();
  } catch (error) {
    console.error('Erro ao atualizar o histórico de conversa:', error);
  }
};

// Rota para salvar perguntas e respostas
app.post('/messages', async (req, res) => {
  const { pergunta } = req.body;

  // Obter o IP ou ID do usuário (neste exemplo, usamos o IP)
  const usuarioId = req.clientIp || req.headers['x-forwarded-for'] || req.socket.remoteAddress;

  try {
    // Recuperar o histórico de conversas do usuário
    const historico = await obterHistoricoConversa(usuarioId);

    // Adiciona a pergunta do usuário ao histórico
    const mensagens = [...historico, { texto: pergunta, papel: 'usuario' }];
    
    // Chamada à IA para gerar a resposta
    const resposta = await obterRespostaDaIA(pergunta); // Função para obter a resposta da IA

    // Adiciona a resposta da IA ao histórico
    mensagens.push({ texto: resposta, papel: 'bot' });

    // Atualiza o histórico no banco de dados
    await atualizarHistoricoConversa(usuarioId, { texto: resposta, papel: 'bot' });

    // Retorna a resposta ao usuário
    res.status(200).send(resposta);
  } catch (error) {
    res.status(500).send('Erro ao processar a mensagem');
  }
});

// Função para obter a resposta da IA (exemplo de integração)
const obterRespostaDaIA = async (pergunta) => {
  // Aqui você pode integrar com a API da IA para gerar uma resposta real.
  try {
    const respostaIA = "Aqui você pode substituir pela lógica de chamada à IA";
    return respostaIA;
  } catch (error) {
    console.error("Erro ao chamar a IA:", error);
    return "Desculpe, não consegui gerar uma resposta.";
  }
};

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



// const express = require('express');
// const mongoose = require('mongoose');
// const bodyParser = require('body-parser');
// const cors = require('cors');
// const requestIp = require('request-ip');
// const https = require('https');
// require('dotenv').config(); // Para carregar variáveis de ambiente

// const app = express();
// const port = process.env.PORT || 3000; // Define a porta pelo ambiente ou usa a 3000

// // Configura o Express para confiar nos proxies
// app.set('trust proxy', true);

// // Conectar ao MongoDB usando variável de ambiente
// const uri = process.env.MONGODB_URI || "mongodb+srv://nathaly:06062007@iahistoriador.muxslkg.mongodb.net/dadosIA?retryWrites=true&w=majority&appName=IAHistoriador";
// mongoose.connect(uri, {
//   useNewUrlParser: true,
//   useUnifiedTopology: true
// })
//   .then(() => console.log('Conectado ao MongoDB'))
//   .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// // Middleware
// app.use(bodyParser.json());
// app.use(cors());
// app.use(requestIp.mw());

// // Criar o schema e o model para armazenar as perguntas
// const perguntaSchema = new mongoose.Schema({
//   pergunta: String,
//   resposta: String,
//   timestamp: { type: Date, default: Date.now }
// });

// const Pergunta = mongoose.model('Pergunta', perguntaSchema);

// // Criar o schema e o model para registrar os acessos
// const acessoSchema = new mongoose.Schema({
//   ip: String,
//   local: String,
//   horario: { type: Date, default: Date.now },
//   servidor: String
// });

// const Acesso = mongoose.model('Acesso', acessoSchema);

// // Função para obter o IP usando o serviço externo
// const obterIpExterno = () => {
//   return new Promise((resolve, reject) => {
//     https.get('https://api.ipify.org?format=json', (res) => {
//       let data = '';

//       res.on('data', (chunk) => {
//         data += chunk;
//       });

//       res.on('end', () => {
//         try {
//           if (data.trim() === '') {
//             reject('Resposta vazia recebida do serviço de IP');
//             return;
//           }

//           const json = JSON.parse(data);
//           if (json.ip) {
//             resolve(json.ip);
//           } else {
//             reject('IP não encontrado na resposta');
//           }
//         } catch (error) {
//           reject('Erro ao processar a resposta JSON: ' + error.message);
//         }
//       });
//     }).on('error', (error) => {
//       reject('Erro ao fazer a requisição: ' + error.message);
//     });
//   });
// };

// // Função para obter a localização com base no IP
// const obterLocalizacao = (ip) => {
//   return new Promise((resolve, reject) => {
//     https.get(`https://geolocation-db.com/json/${ip}&position=true`, (res) => {
//       let data = '';

//       res.on('data', (chunk) => {
//         data += chunk;
//       });

//       res.on('end', () => {
//         try {
//           if (data.trim() === '') {
//             resolve('Localização desconhecida');
//             return;
//           }

//           const json = JSON.parse(data);
//           if (json.city && json.state && json.country_name) {
//             resolve(`${json.city}, ${json.state}, ${json.country_name}`);
//           } else {
//             resolve('Localização desconhecida');
//           }
//         } catch (error) {
//           reject('Erro ao processar a resposta JSON: ' + error.message);
//         }
//       });
//     }).on('error', (error) => {
//       reject('Erro ao fazer a requisição: ' + error.message);
//     });
//   });
// };

// // Middleware para registrar o acesso com todos os dados (IP, localização, servidor)
// app.use(async (req, res, next) => {
//   let ip = req.clientIp || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
//   const servidor = req.hostname || 'Desconhecido';

//   // Obtendo o IP do cliente usando o serviço externo
//   try {
//     ip = await obterIpExterno(); // Usa o IP obtido do serviço externo
//   } catch (error) {
//     console.error('Erro ao obter IP externo:', error);
//   }

//   // Obtendo a localização com base no IP
//   let local = 'Localização desconhecida';

//   try {
//     local = await obterLocalizacao(ip);
//   } catch (error) {
//     console.error('Erro ao obter localização:', error);
//   }

//   // Cria o registro de acesso com IP, localização e servidor
//   const novoAcesso = new Acesso({
//     ip: ip,
//     local: local,
//     servidor: servidor
//   });

//   try {
//     await novoAcesso.save();
//     console.log('Acesso registrado com sucesso');
//   } catch (error) {
//     console.error('Erro ao registrar acesso:', error);
//   }

//   next();
// });

// // Rota para salvar perguntas e respostas
// app.post('/messages', async (req, res) => {
//   const { pergunta, resposta } = req.body;
//   try {
//     const novaPergunta = new Pergunta({ pergunta, resposta });
//     await novaPergunta.save();
//     res.status(201).send('Pergunta salva com sucesso');
//   } catch (error) {
//     res.status(500).send('Erro ao salvar pergunta');
//   }
// });

// // Rota para listar perguntas
// app.get('/messages', async (req, res) => {
//   try {
//     const perguntas = await Pergunta.find();
//     res.status(200).json(perguntas);
//   } catch (error) {
//     res.status(500).send('Erro ao carregar perguntas');
//   }
// });

// // Rota para listar os acessos
// app.get('/acessos', async (req, res) => {
//   try {
//     const acessos = await Acesso.find();
//     res.status(200).json(acessos);
//   } catch (error) {
//     res.status(500).send('Erro ao carregar acessos');
//   }
// });

// // Iniciar o servidor
// app.listen(port, () => {
//   console.log(`Servidor rodando na porta ${port}`);
// });
