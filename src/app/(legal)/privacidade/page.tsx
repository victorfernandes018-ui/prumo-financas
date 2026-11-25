export const metadata = { title: "Política de Privacidade" };

export default function PrivacyPage() {
  return (
    <>
      <h1>Política de Privacidade</h1>
      <p className="text-sm text-muted">Versão beta · atualizado em setembro de 2026</p>
      <p>Esta política explica quais dados o Prumo coleta, por que e como você pode controlá-los, em linha com a Lei Geral de Proteção de Dados (LGPD).</p>
      <h2>Dados que coletamos</h2>
      <ul>
        <li><b>Conta:</b> nome, e-mail, foto (opcional) e senha (armazenada apenas como hash criptográfico — nunca em texto).</li>
        <li><b>Dados financeiros que você registra:</b> receitas, despesas, contas, cartões (nome, limite e datas — nunca número do cartão), metas e orçamentos.</li>
        <li><b>Preferências:</b> moeda, tema, início do mês financeiro e notificações.</li>
        <li><b>Segurança:</b> informações técnicas da sessão (como o navegador usado) para manter você conectado com segurança.</li>
      </ul>
      <h2>Para que usamos</h2>
      <ul>
        <li>Mostrar seus resumos, gráficos, alertas e a análise de saúde financeira.</li>
        <li>Enviar e-mails essenciais, como boas-vindas e redefinição de senha.</li>
        <li>Proteger sua conta contra acessos indevidos.</li>
      </ul>
      <h2>Assistente com IA</h2>
      <p>Quando você faz uma pergunta ao assistente, um resumo dos seus dados financeiros é enviado a um provedor de inteligência artificial (Anthropic) apenas para gerar a resposta. Não enviamos senha nem dados de contato.</p>
      <h2>Compartilhamento</h2>
      <p>Não vendemos seus dados. Eles são processados apenas por fornecedores necessários ao funcionamento do serviço (hospedagem, banco de dados, envio de e-mails e IA).</p>
      <h2>Seus direitos</h2>
      <ul>
        <li>Acessar e baixar todos os seus dados (Perfil → Exportação de dados).</li>
        <li>Corrigir suas informações a qualquer momento.</li>
        <li>Excluir sua conta e todos os dados associados (Perfil → Excluir conta).</li>
      </ul>
      <h2>Segurança</h2>
      <p>Usamos conexão criptografada (HTTPS), senhas com hash, sessões revogáveis e controle de acesso para que cada pessoa veja somente os próprios dados.</p>
    </>
  );
}
