import "server-only";
import type { SafeUser } from "../auth/tokens";
import { userHasFeature } from "../features";
import { AssistantRefusal, ClaudeProvider } from "./claude-provider";
import { RulesProvider } from "./rules-provider";
import type { AssistantReply, FinancialSnapshot } from "./types";

const rules = new RulesProvider();
let claude: ClaudeProvider | null = null;

/** IA (Claude) quando configurada e liberada para o plano; senão, o motor de regras local. */
export function aiEnabledFor(user: Pick<SafeUser, "plan">) {
  return !!process.env.ANTHROPIC_API_KEY && userHasFeature(user, "ai_assistant");
}

export async function answer(
  user: Pick<SafeUser, "plan">,
  message: string,
  snapshot: FinancialSnapshot,
  history: { role: "user" | "assistant"; content: string }[],
): Promise<AssistantReply> {
  if (aiEnabledFor(user)) {
    claude ??= new ClaudeProvider();
    try {
      return await claude.reply(message, snapshot, history);
    } catch (e) {
      // Qualquer falha da IA (recusa, limite, rede) cai para o motor de regras — o usuário sempre recebe resposta
      if (!(e instanceof AssistantRefusal)) console.error("[assistant] IA indisponível, usando regras:", e instanceof Error ? e.message : e);
    }
  }
  return rules.reply(message, snapshot);
}
