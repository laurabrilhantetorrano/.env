const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const Usuario = require("../models/User");
const { enviarEmailRedefinicao } = require("../utils/email");

// ─────────────────────────────────────────────
// Função auxiliar: gera um token JWT para o usuário
// ─────────────────────────────────────────────
const gerarToken = (id) => {
  return jwt.sign(
    { id }, // payload: dados que ficam "dentro" do token
    process.env.JWT_SECRET, // chave secreta para assinar
    { expiresIn: process.env.JWT_EXPIRES_IN } // tempo de validade
  );
};

// ─────────────────────────────────────────────
// POST /api/usuarios/cadastrar
// Cria um novo usuário no banco de dados
// ─────────────────────────────────────────────
const cadastrar = async (req, res) => {
  try {
    const { nome, email, senha } = req.body;

    // Validação básica dos campos obrigatórios
    if (!nome || !email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Nome, e-mail e senha são obrigatórios.",
      });
    }

    // Verifica se já existe um usuário com este e-mail
    const emailJaCadastrado = await Usuario.findOne({ email });
    if (emailJaCadastrado) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Este e-mail já está cadastrado.",
      });
    }

    // Cria o usuário (a senha é hasheada automaticamente pelo middleware do Model)
    const usuario = await Usuario.create({ nome, email, senha });

    // Gera o token JWT para o usuário já ficar logado após o cadastro
    const token = gerarToken(usuario._id);

    return res.status(201).json({
      sucesso: true,
      mensagem: "Usuário cadastrado com sucesso!",
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/usuarios/login
// Autentica o usuário e retorna um token JWT
// ─────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "E-mail e senha são obrigatórios.",
      });
    }

    // Busca o usuário pelo e-mail E inclui o campo senha (que é select: false no Model)
    const usuario = await Usuario.findOne({ email, ativo: true }).select(
      "+senha"
    );

    // Verifica se o usuário existe E se a senha está correta
    // (verificamos os dois juntos por segurança, para não revelar qual está errado)
    if (!usuario || !(await usuario.senhaCorreta(senha))) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "E-mail ou senha inválidos.",
      });
    }

    const token = gerarToken(usuario._id);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Login realizado com sucesso!",
      token,
      usuario: {
        id: usuario._id,
        nome: usuario.nome,
        email: usuario.email,
      },
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// GET /api/usuarios/perfil
// Retorna os dados do usuário logado (rota protegida)
// ─────────────────────────────────────────────
const perfil = async (req, res) => {
  // req.usuario é preenchido pelo middleware de autenticação
  const usuario = req.usuario;

  return res.status(200).json({
    sucesso: true,
    usuario: {
      id: usuario._id,
      nome: usuario.nome,
      email: usuario.email,
      criadoEm: usuario.createdAt,
    },
  });
};

// ─────────────────────────────────────────────
// PUT /api/usuarios/editar
// Atualiza nome e/ou e-mail do usuário logado
// ─────────────────────────────────────────────
const editar = async (req, res) => {
  try {
    const { nome, email } = req.body;

    // Monta apenas os campos que foram enviados
    const dadosAtualizados = {};
    if (nome) dadosAtualizados.nome = nome;
    if (email) dadosAtualizados.email = email;

    if (Object.keys(dadosAtualizados).length === 0) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe ao menos um campo para atualizar (nome ou e-mail).",
      });
    }

    // Verifica se o novo e-mail já pertence a outro usuário
    if (email) {
      const emailEmUso = await Usuario.findOne({
        email,
        _id: { $ne: req.usuario._id }, // $ne = "not equal" (diferente do usuário atual)
      });
      if (emailEmUso) {
        return res.status(400).json({
          sucesso: false,
          mensagem: "Este e-mail já está em uso por outro usuário.",
        });
      }
    }

    // Atualiza o usuário e retorna o documento atualizado
    const usuarioAtualizado = await Usuario.findByIdAndUpdate(
      req.usuario._id,
      dadosAtualizados,
      { new: true, runValidators: true } // new: true → retorna o doc atualizado
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: "Dados atualizados com sucesso!",
      usuario: {
        id: usuarioAtualizado._id,
        nome: usuarioAtualizado.nome,
        email: usuarioAtualizado.email,
      },
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// DELETE /api/usuarios/desativar
// Desativa a conta do usuário (soft delete)
// O registro permanece no banco, apenas ativo=false
// ─────────────────────────────────────────────
const desativar = async (req, res) => {
  try {
    await Usuario.findByIdAndUpdate(req.usuario._id, { ativo: false });

    return res.status(200).json({
      sucesso: true,
      mensagem: "Conta desativada com sucesso.",
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/usuarios/esqueci-senha
// Envia e-mail com link para redefinir a senha
// ─────────────────────────────────────────────
const esqueciSenha = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Informe o e-mail cadastrado.",
      });
    }

    const usuario = await Usuario.findOne({ email, ativo: true });

    // Por segurança, retornamos a mesma mensagem mesmo se o e-mail não existir
    // (para não revelar quais e-mails estão cadastrados no sistema)
    if (!usuario) {
      return res.status(200).json({
        sucesso: true,
        mensagem:
          "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
      });
    }

    // Gera um token aleatório seguro (32 bytes em hexadecimal = 64 caracteres)
    const token = crypto.randomBytes(32).toString("hex");

    // Salva o token e define expiração de 1 hora a partir de agora
    usuario.tokenRedefinicaoSenha = token;
    usuario.tokenRedefinicaoExpira = new Date(Date.now() + 60 * 60 * 1000); // +1 hora
    await usuario.save({ validateBeforeSave: false });

    // Envia o e-mail com o link de redefinição
    await enviarEmailRedefinicao(usuario.email, usuario.nome, token);

    return res.status(200).json({
      sucesso: true,
      mensagem:
        "Se este e-mail estiver cadastrado, você receberá as instruções em breve.",
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro ao enviar e-mail. Tente novamente.",
      erro: erro.message,
    });
  }
};

// ─────────────────────────────────────────────
// POST /api/usuarios/redefinir-senha
// Redefine a senha usando o token recebido por e-mail
// ─────────────────────────────────────────────
const redefinirSenha = async (req, res) => {
  try {
    const { token, novaSenha } = req.body;

    if (!token || !novaSenha) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Token e nova senha são obrigatórios.",
      });
    }

    // Busca o usuário pelo token E verifica se ainda não expirou
    const usuario = await Usuario.findOne({
      tokenRedefinicaoSenha: token,
      tokenRedefinicaoExpira: { $gt: Date.now() }, // $gt = "greater than" (maior que agora)
    }).select("+tokenRedefinicaoSenha +tokenRedefinicaoExpira +senha");

    if (!usuario) {
      return res.status(400).json({
        sucesso: false,
        mensagem: "Token inválido ou expirado. Solicite um novo link.",
      });
    }

    // Atualiza a senha e limpa os campos de token
    usuario.senha = novaSenha;
    usuario.tokenRedefinicaoSenha = undefined;
    usuario.tokenRedefinicaoExpira = undefined;
    await usuario.save(); // o pre-save vai fazer o hash da nova senha automaticamente

    // Gera um novo token JWT para o usuário já ficar logado
    const jwtToken = gerarToken(usuario._id);

    return res.status(200).json({
      sucesso: true,
      mensagem: "Senha redefinida com sucesso!",
      token: jwtToken,
    });
  } catch (erro) {
    return res.status(500).json({
      sucesso: false,
      mensagem: "Erro interno no servidor.",
      erro: erro.message,
    });
  }
};

module.exports = {
  cadastrar,
  login,
  perfil,
  editar,
  desativar,
  esqueciSenha,
  redefinirSenha,
};
