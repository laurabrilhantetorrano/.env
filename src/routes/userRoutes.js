const express = require("express");
const router = express.Router();

const {
  cadastrar,
  login,
  perfil,
  editar,
  desativar,
  esqueciSenha,
  redefinirSenha,
} = require("../controllers/userController");

const autenticar = require("../middleware/auth");

// ─────────────────────────────────────────────
// ROTAS PÚBLICAS (não precisam de login)
// ─────────────────────────────────────────────

// Cadastro de novo usuário
// POST /api/usuarios/cadastrar
router.post("/cadastrar", cadastrar);

// Login
// POST /api/usuarios/login
router.post("/login", login);

// Solicitar e-mail de recuperação de senha
// POST /api/usuarios/esqueci-senha
router.post("/esqueci-senha", esqueciSenha);

// Redefinir senha com o token recebido por e-mail
// POST /api/usuarios/redefinir-senha
router.post("/redefinir-senha", redefinirSenha);

// ─────────────────────────────────────────────
// ROTAS PRIVADAS (precisam do token JWT)
// O middleware "autenticar" é executado antes do controller
// ─────────────────────────────────────────────

// Ver dados do próprio perfil
// GET /api/usuarios/perfil
router.get("/perfil", autenticar, perfil);

// Editar nome e/ou e-mail
// PUT /api/usuarios/editar
router.put("/editar", autenticar, editar);

// Desativar conta (soft delete)
// DELETE /api/usuarios/desativar
router.delete("/desativar", autenticar, desativar);

module.exports = router;
