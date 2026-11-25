export const metadata = { title: "Termos de Uso" };

export default function TermsPage() {
  return (
    <>
      <h1>Termos de Uso</h1>
      <p className="text-sm text-muted">Versão beta · atualizado em setembro de 2026</p>
      <p>Ao criar uma conta no Prumo, você concorda com estes termos. Leia com atenção.</p>
      <h2>1. O que é o Prumo</h2>
      <p>O Prumo é uma ferramenta de organização financeira pessoal. Você registra suas receitas, despesas, cartões, metas e orçamentos, e o app apresenta resumos, gráficos e alertas com base nesses registros.</p>
      <h2>2. Fase de testes (beta)</h2>
      <p>O Prumo está em fase de testes. Funcionalidades podem mudar, apresentar falhas ou ser removidas, e dados podem precisar ser apagados em atualizações. Recomendamos exportar seus dados periodicamente (Perfil → Exportação de dados).</p>
      <h2>3. Não é aconselhamento financeiro</h2>
      <p>As análises, a pontuação de organização financeira e as respostas do assistente são informativas, calculadas apenas a partir dos dados que você registrou. Não constituem recomendação de investimento, consultoria financeira, contábil ou jurídica, nem score de crédito.</p>
      <h2>4. Sua conta</h2>
      <ul>
        <li>Você é responsável pela veracidade dos dados que registra e pela segurança da sua senha.</li>
        <li>Não use o Prumo para atividades ilegais ou para tentar acessar dados de outras pessoas.</li>
        <li>Você pode excluir sua conta a qualquer momento em Perfil → Excluir conta.</li>
      </ul>
      <h2>5. Integrações bancárias</h2>
      <p>O Prumo não se conecta ao seu banco nem movimenta dinheiro. Todos os lançamentos são feitos manualmente por você.</p>
      <h2>6. Limitação de responsabilidade</h2>
      <p>O Prumo é fornecido &quot;como está&quot; durante o beta. Não nos responsabilizamos por decisões tomadas com base nas informações exibidas.</p>
      <h2>7. Contato</h2>
      <p>Dúvidas sobre estes termos podem ser enviadas ao responsável pelo Prumo.</p>
    </>
  );
}
