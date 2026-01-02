export function getDisplayName(profile: any) {
  if (!profile) return "User";
  return (
    profile.display_name ||
    profile.artistic_name ||
    profile.name ||
    (profile.id ? `User ${String(profile.id).slice(0, 6)}` : "User")
  );
}
