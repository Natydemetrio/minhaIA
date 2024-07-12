<template>
  <body>
    <div class="container">
      <h1>Historiador Virtual</h1>
      <form id="question-form">
        <label for="question">Pergunta:</label>
        <input type="text" v-model="form.pergunta" id="question" name="question" required>
        <button type="button" @click="runIA">Perguntar</button>
      </form>
      <textarea v-model="form.resposta" id="answer" rows="10" cols="30">
      
      </textarea>
    </div>
  </body>
</template>

<script>
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
  data(){
    return{
      form:{
        pergunta:"",
        resposta:""
      }
    };
  },

  methods: {

    async runIA() {
      const chatSession = model.startChat({
        generationConfig,
        // safetySettings: Adjust safety settings
        // See https://ai.google.dev/gemini-api/docs/safety-settings
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
      this.form.resposta=result.response.text();
      console.log(result.response.text());
    }
  }
};




// run();
</script>

<style scoped>
body {
  font-family: Arial, sans-serif;
  background-color: #f4f4f4;
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  margin: 0;
}

.container {
  background-color: #fff;
  padding: 20px;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.1);
  border-radius: 5px;
  text-align: center;
}

h1 {
  margin-bottom: 20px;
}

form {
  display: flex;
  flex-direction: column;
  align-items: center;
}

label {
  margin-bottom: 10px;
}

input {
  padding: 10px;
  margin-bottom: 20px;
  border: 1px solid #ccc;
  border-radius: 5px;
}

button {
  padding: 10px 20px;
  background-color: #007bff;
  color: #fff;
  border: none;
  border-radius: 5px;
  cursor: pointer;
}

button:hover {
  background-color: #0056b3;
}

#answer {
  margin-top: 20px;
  font-weight: bold;
}
</style>
