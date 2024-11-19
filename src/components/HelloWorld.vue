<template>
  <body>
    <div class="chat-container">
      <div class="chat-header">
        <h1>Historiador Virtual</h1>
        <p>Criadora: Nathaly Gabrieli Goergen Demetrio</p>
      </div>
      <div class="chat-body">
        <div v-for="(message, index) in messages" :key="index" :class="message.role">
          <p>{{ message.text }}</p>
        </div>
      </div>
      <div class="chat-footer">
        <form id="question-form" @submit.prevent="runIA">
          <input type="text" v-model="form.pergunta" id="question" name="question" required
            placeholder="Digite sua pergunta...">
          <button type="submit">Perguntar</button>
        </form>
      </div>
    </div>
  </body>
</template>

<script>
import axios from 'axios';

// Inicializar o modelo dentro do componente, para garantir que o ciclo de vida do Vue seja respeitado
const { GoogleGenerativeAI } = require("@google/generative-ai");

const apiKey = "AIzaSyDQdnjmdZSvSQVIzsKLUFRPXRBaQzo0xWk";
let genAI;

export default {
  name: 'HelloWorld',
  data() {
    return {
      form: {
        pergunta: "",
        resposta: ""
      },
      messages: []
    };
  },

  async created() {
    // Inicializar o genAI somente quando o componente for criado
    genAI = new GoogleGenerativeAI(apiKey);
    
    // Configuração do modelo
    this.model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-8b",
    });

    // Carregar mensagens do backend na inicialização
    try {
      const response = await axios.get('https://api-backend-chatbot.onrender.com/messages');
      this.messages = response.data.map(item => ({
        role: item.role || 'bot-message', // Garantir que role seja definido
        text: item.pergunta || item.resposta || 'Mensagem sem conteúdo'
      }));
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  },

  methods: {
    async runIA() {
      const userMessage = {
        role: 'user-message',
        text: this.form.pergunta
      };
      this.messages.push(userMessage);

      // Configuração da conversa inicial
      const chatSession = this.model.startChat({
        generationConfig: {
          temperature: 1,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 8192,
          responseMimeType: "text/plain"
        },
        history: [
          {
            role: "user",
            parts: [
              { text: "gemini, você é um historiador e irá falar sobre qualquer fato ou acontecimento histórico..." }
            ]
          }
        ],
      });

      // Enviar a pergunta e receber a resposta
      try {
        const result = await chatSession.sendMessage(this.form.pergunta);
        const botMessage = {
          role: 'bot-message',
          text: result.response.text()
        };
        this.messages.push(botMessage);
        
        // Salvar pergunta e resposta no backend
        await axios.post('https://api-backend-chatbot.onrender.com/messages', {
          pergunta: this.form.pergunta,
          resposta: botMessage.text
        });

        // Limpar o campo de pergunta
        this.form.pergunta = "";
      } catch (error) {
        console.error('Erro ao comunicar com a AI:', error);
      }
    }
  }
};
</script>

<style scoped>
body {
  margin: 0;
  padding: 0;
  height: 100%;
  font-family: Arial, sans-serif;
  background-color: #f7f7f7;
}

.chat-container {
  display: flex;
  flex-direction: column;
  margin-top: -60px;
  margin-left: -7px;
  margin-right: -8px;
  margin-bottom: -60px;
  height: 100vh;
  font-family: Arial, sans-serif;
}

.chat-header {
  background-color: #333;
  color: white;
  padding: 10px;
  text-align: center;
}

.chat-body {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  background-color: #f7f7f7;
  display: flex;
  flex-direction: column;
}

.user-message,
.bot-message {
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 10px;
  max-width: 60%;
  word-wrap: break-word;
}

.user-message {
  background-color: #e0e0e0;
  color: black;
  align-self: flex-end;
}

.bot-message {
  background-color: #444;
  color: white;
  align-self: flex-start;
}

.chat-footer {
  display: flex;
  padding: 10px;
  background-color: #fff;
  border-top: 1px solid #ccc;
}

#question-form {
  display: flex;
  width: 100%;
}

#question {
  flex: 1;
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 5px 0 0 5px;
  outline: none;
}

button {
  padding: 10px 20px;
  background-color: #333;
  color: white;
  border: none;
  border-radius: 0 5px 5px 0;
  cursor: pointer;
}

button:hover {
  background-color: #555;
}
</style>
