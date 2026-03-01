import { Stack, Typography } from "@mui/material";
import { ProfilePreferencesForm } from "../components/ProfilePreferencesForm";

export function SettingsPage() {
  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" fontWeight={700}>
        Settings
      </Typography>
      <ProfilePreferencesForm />
    </Stack>
  );
}
