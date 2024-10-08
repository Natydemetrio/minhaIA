<template>
  <body>
    <div class="chat-container">
      <div class="chat-header">
        <h1>Historiador Virtual</h1>
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
    <p>Criadora: Nathaly Gabrieli Goergen Demetrio</p>
  </body>
</template>


<script>
import axios from 'axios';


const {
  GoogleGenerativeAI,
  HarmCategory,
  HarmBlockThreshold,
} = require("@google/generative-ai");

HarmCategory;
HarmBlockThreshold;
const apiKey = "AIzaSyDQdnjmdZSvSQVIzsKLUFRPXRBaQzo0xWk";
const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
});

const generationConfig = {
  temperature: 1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

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
    // Carregar mensagens do backend na inicialização
    try {
      const response = await axios.get('http://localhost:3000/messages');
      this.messages = response.data.map(({
        role: 'bot-message',
        // text: item.pergunta
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

      const chatSession = model.startChat({
        generationConfig,
        history: [
          {
            role: "user",
            parts: [
              { text: "gemini, você é um historiador e irá falar sobre qualquer fato ou acontecimento histórico que a pessoa te pedir, e irá responder a todas as perguntas sobre o fato histórico pedido, nas próximas conversas você poderá falar apenas sobre isso\n" },
            ],
          },
        ],
      });


      const result = await chatSession.sendMessage(this.form.pergunta);
      const botMessage = {
        role: 'bot-message',
        text: result.response.text()
      };
      this.messages.push(botMessage);
      await axios.post('http://localhost:3000/messages', {
        pergunta: this.form.pergunta,
        resposta: botMessage.text
      });

      this.form.pergunta = "";
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