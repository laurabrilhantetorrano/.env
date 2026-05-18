const nodemailer = require("nodemailer");

/**
 * Cria o "transportador" de e-mail usando as configurações do .env.
 * Suporta Gmail e outros provedores SMTP.
 */
const transportador = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

/**
 * Envia o e-mail de redefinição de senha.
 * @param {string} email - E-mail do destinatário
 * @param {string} nome - Nome do usuário
 * @param {string} token - Token único de redefinição
 */
const enviarEmailRedefinicao = async (email, nome, token) => {
  // Monta o link que o usuário vai clicar no e-mail
  const linkRedefinicao = `${process.env.FRONTEND_URL}/redefinir-senha?token=${token}`;

  const opcoes = {
    from: `"Suporte" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Redefinição de Senha",
    // Versão em texto puro (para clientes de e-mail que não suportam HTML)
    text: `Olá, ${nome}! Acesse o link para redefinir sua senha: ${linkRedefinicao}. O link expira em 1 hora.`,
    // Versão HTML com formatação
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto;">
        <h2 style="color: #333;">Redefinição de Senha</h2>
        <p>Olá, <strong>${nome}</strong>!</p>
        <p>Recebemos uma solicitação para redefinir a senha da sua conta.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <a href="${linkRedefinicao}"
           style="display: inline-block; padding: 12px 24px; background-color: #4f46e5;
                  color: white; text-decoration: none; border-radius: 6px; margin: 16px 0;">
          Redefinir Senha
        </a>
        <p style="color: #666; font-size: 14px;">
          ⚠️ Este link expira em <strong>1 hora</strong>.
        </p>
        <p style="color: #666; font-size: 14px;">
          Se você não solicitou a redefinição, ignore este e-mail.
        </p>
      </div>
    `,
  };

  await transportador.sendMail(opcoes);
};

module.exports = { enviarEmailRedefinicao };
