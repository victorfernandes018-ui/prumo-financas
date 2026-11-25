import { requireUser } from "@/server/auth/session";
import { db } from "@/server/db";
import { ProfileView } from "@/components/features/profile/profile-view";

export const metadata = { title: "Perfil" };

export default async function ProfilePage() {
  const user = await requireUser();
  const [sessions, auth] = await Promise.all([
    db.session.count({ where: { userId: user.id } }),
    db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } }),
  ]);
  return (
    <ProfileView
      profile={{
        name: user.name, email: user.email, avatarUrl: user.avatarUrl, currency: user.currency, monthStartDay: user.monthStartDay, theme: user.theme,
        notifyBills: user.notifyBills, notifyBudget: user.notifyBudget, notifyGoals: user.notifyGoals, notifyInsights: user.notifyInsights,
        plan: user.plan, createdAt: user.createdAt.toISOString(),
      }}
      sessions={sessions}
      hasPassword={!!auth?.passwordHash}
    />
  );
}
