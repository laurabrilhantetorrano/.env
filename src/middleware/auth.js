const jwt = require("jsonwebtoken");
const Usuario = require("../models/User");

/**
 * Middleware de Autenticação JWT.
 *
 * Protege rotas que exigem login. Antes de acessar a rota,
 * o usuário precisa enviar um token JWT válido no header:
 *   Authorization: Bearer <token>
 */
const autenticar = async (req, res, next) => {
  try {
    // 1. Verifica se o token foi enviado no header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Acesso negado. Faça login para continuar.",
      });
    }

    // 2. Extrai o token (remove o prefixo "Bearer ")
    const token = authHeader.split(" ")[1];

    // 3. Verifica se o token é válido e não expirou
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // 4. Busca o usuário no banco usando o ID dentro do token
    const usuario = await Usuario.findById(payload.id);

    if (!usuario || !usuario.ativo) {
      return res.status(401).json({
        sucesso: false,
        mensagem: "Usuário não encontrado ou inativo.",
      });
    }

    // 5. Adiciona o usuário na requisição para ser usado nas rotas seguintes
    req.usuario = usuario;

    // 6. Passa para a próxima função (a rota em si)
    next();
  } catch (erro) {
    // Token inválido ou expirado
    return res.status(401).json({
      sucesso: false,
      mensagem: "Token inválido ou expirado. Faça login novamente.",
    });
  }
};

module.exports = autenticar;
