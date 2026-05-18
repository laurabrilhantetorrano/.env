const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

/**
 * Schema do Usuário - define a estrutura dos documentos no MongoDB.
 * Cada campo tem seu tipo e validações.
 */
const usuarioSchema = new mongoose.Schema(
  {
    nome: {
      type: String,
      required: [true, "O nome é obrigatório"],
      trim: true, // remove espaços extras no início e fim
    },
    email: {
      type: String,
      required: [true, "O e-mail é obrigatório"],
      unique: true, // não permite dois usuários com o mesmo e-mail
      lowercase: true, // salva sempre em minúsculo
      trim: true,
    },
    senha: {
      type: String,
      required: [true, "A senha é obrigatória"],
      minlength: [6, "A senha deve ter no mínimo 6 caracteres"],
      select: false, // a senha NÃO é retornada nas consultas por padrão
    },
    ativo: {
      type: Boolean,
      default: true, // ao cadastrar, o usuário já está ativo
    },
    // Token temporário usado no fluxo "Esqueci a senha"
    tokenRedefinicaoSenha: {
      type: String,
      select: false, // não retorna nas consultas
    },
    tokenRedefinicaoExpira: {
      type: Date,
      select: false,
    },
  },
  {
    // timestamps adiciona automaticamente os campos createdAt e updatedAt
    timestamps: true,
  }
);

/**
 * Middleware do Mongoose: executa ANTES de salvar o documento.
 * Faz o hash (criptografia) da senha para não salvar em texto puro.
 */
usuarioSchema.pre("save", async function (next) {
  // Só faz o hash se a senha foi modificada (evita re-hash em outras atualizações)
  if (!this.isModified("senha")) return next();

  // Gera o hash com "custo 12" (quanto maior, mais seguro e mais lento)
  this.senha = await bcrypt.hash(this.senha, 12);
  next();
});

/**
 * Método de instância: compara a senha digitada com o hash salvo no banco.
 * Retorna true se a senha estiver correta, false caso contrário.
 */
usuarioSchema.methods.senhaCorreta = async function (senhaDigitada) {
  return await bcrypt.compare(senhaDigitada, this.senha);
};

// Cria e exporta o Model "Usuario" baseado no schema acima
const Usuario = mongoose.model("Usuario", usuarioSchema);

module.exports = Usuario;
