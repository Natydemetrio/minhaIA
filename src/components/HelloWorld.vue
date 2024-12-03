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
    // Inicializa o modelo (caso utilize uma API de IA, substitua por sua instância real)
    genAI = new GoogleGenerativeAI(apiKey);
    try {
      this.model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-8b",
    }); // Substitua isso pela instância real do seu modelo
      console.log('Modelo carregado com sucesso');
      
      // Recupera o histórico de conversas do usuário
      const response = await axios.get('https://api-backend-chatbot.onrender.com/messages');
      this.messages = response.data.map(item => ({
        role: item.role || 'bot-message', // Garantir que role seja definido
        text: item.pergunta || item.resposta || 'Mensagem sem conteúdo'
      }));
    } catch (error) {
      console.error('Erro ao carregar o modelo ou mensagens:', error);
    }
  },
  methods: {
  async runIA() {
    if (!this.model) {
      console.error('Modelo não foi carregado corretamente.');
      return;
    }

    // Adiciona a mensagem do usuário ao histórico
    const userMessage = {
      role: 'user-message',
      text: this.form.pergunta
    };
    this.messages.push(userMessage);

    try {
      // Envia a pergunta para o backend
      const response = await axios.post('https://api-backend-chatbot.onrender.com/messages', {
        pergunta: this.form.pergunta
      });

      // A resposta do backend será a resposta da IA
      const botMessage = {
        role: 'bot-message',
        text: response.data // Resposta recebida do backend
      };
      this.messages.push(botMessage);

      // Salva a pergunta e resposta no backend
      await axios.post('https://api-backend-chatbot.onrender.com/messages', {
        pergunta: this.form.pergunta,
        resposta: botMessage.text
      });

      this.form.pergunta = ""; // Limpa a pergunta após o envio
    } catch (error) {
      console.error('Erro ao comunicar com a IA:', error);
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
}</style>
