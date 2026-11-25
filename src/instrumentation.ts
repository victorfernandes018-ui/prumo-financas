// Executado uma vez quando o servidor sobe.
// Servidores em nuvem rodam em UTC; as datas do app ("hoje", mês financeiro, vencimentos)
// são calculadas no fuso do público-alvo. Configure APP_TIMEZONE para mudar.
export function register() {
  process.env.TZ = process.env.APP_TIMEZONE || "America/Sao_Paulo";
}
