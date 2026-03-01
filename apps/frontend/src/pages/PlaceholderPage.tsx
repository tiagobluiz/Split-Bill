import { Stack, Typography } from "@mui/material";
import { PageZone } from "../layout/AppShell";

export function PlaceholderPage({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1" fontWeight={700}>
        {title}
      </Typography>
      <PageZone title="Primary content">
        <Typography color="text.secondary">{description}</Typography>
      </PageZone>
    </Stack>
  );
}
