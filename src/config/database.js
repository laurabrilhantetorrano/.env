const mongoose = require("mongoose");

/**
 * Conecta ao banco de dados MongoDB Atlas.
 * A URL de conexão vem da variável de ambiente MONGODB_URI.
 */
const conectarBanco = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ Conectado ao MongoDB Atlas com sucesso!");
  } catch (erro) {
    console.error("❌ Erro ao conectar ao banco de dados:", erro.message);
    // Encerra o processo se não conseguir conectar ao banco
    process.exit(1);
  }
};

module.exports = conectarBanco;
